import type { FastifyRateLimitStore } from '@fastify/rate-limit';
import { Redis as UpstashRedis } from '@upstash/redis';
import { Redis as IORedis } from 'ioredis';
import type { RouteOptions } from 'fastify';

const WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`;

type CounterResult = readonly [number, number];

interface AtomicCounter {
  increment(key: string, windowMs: number): Promise<CounterResult>;
}

function durationMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const match = /^(\d+)\s*(ms|s|m|h)?$/i.exec(value.trim());
    if (match) {
      const amount = Number(match[1]);
      const unit = match[2]?.toLowerCase() ?? 'ms';
      return amount * (unit === 'h' ? 3_600_000 : unit === 'm' ? 60_000 : unit === 's' ? 1_000 : 1);
    }
  }
  throw new Error('A positive rate-limit time window is required.');
}

function standardRedisCounter(url: string): AtomicCounter {
  if (!/^rediss?:\/\//i.test(url)) {
    throw new Error('REDIS_URL must use redis:// or rediss://.');
  }
  const redis = new IORedis(url, {
    enableReadyCheck: true,
    maxRetriesPerRequest: 1,
    ...(url.toLowerCase().startsWith('rediss://') ? { tls: {} } : {}),
  });
  return {
    async increment(key, windowMs) {
      const result = await redis.eval(WINDOW_SCRIPT, 1, key, String(windowMs));
      if (!Array.isArray(result) || result.length !== 2) {
        throw new Error('Distributed rate limit returned an invalid counter.');
      }
      const current = Number(result[0]);
      const ttl = Number(result[1]);
      if (!Number.isFinite(current) || !Number.isFinite(ttl)) {
        throw new Error('Distributed rate limit returned a non-numeric counter.');
      }
      return [current, ttl];
    },
  };
}

function upstashCounter(url: string, token: string): AtomicCounter {
  const redis = new UpstashRedis({ url, token, enableTelemetry: false });
  return {
    async increment(key, windowMs) {
      const result = await redis.eval(WINDOW_SCRIPT, [key], [String(windowMs)]);
      if (!Array.isArray(result) || result.length !== 2) {
        throw new Error('Distributed rate limit returned an invalid counter.');
      }
      const current = Number(result[0]);
      const ttl = Number(result[1]);
      if (!Number.isFinite(current) || !Number.isFinite(ttl)) {
        throw new Error('Distributed rate limit returned a non-numeric counter.');
      }
      return [current, ttl];
    },
  };
}

function counterFromEnvironment(): AtomicCounter {
  const awsRedisUrl = process.env.REDIS_URL?.trim();
  if (awsRedisUrl) return standardRedisCounter(awsRedisUrl);

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (upstashUrl && upstashToken) return upstashCounter(upstashUrl, upstashToken);

  throw new Error('Distributed rate limiting requires REDIS_URL or temporary Upstash credentials.');
}

/**
 * Shared atomic fixed-window counter. REDIS_URL selects AWS ElastiCache/Valkey during cutover;
 * the Upstash branch remains only to make rollback possible before the AWS path is proven.
 */
export class RedisRateLimitStore implements FastifyRateLimitStore {
  private readonly counter: AtomicCounter;
  private readonly timeWindowMs: number;

  constructor(options: { timeWindow?: number | string }) {
    this.counter = counterFromEnvironment();
    this.timeWindowMs = durationMs(options.timeWindow);
  }

  incr(
    key: string,
    callback: (error: Error | null, result?: { current: number; ttl: number }) => void,
  ): void {
    void this.counter
      .increment(`voomate:rate-limit:${key}`, this.timeWindowMs)
      .then(([current, ttl]) => callback(null, { current, ttl: Math.max(ttl, 0) }))
      .catch((error: unknown) =>
        callback(error instanceof Error ? error : new Error('Distributed rate limit failed.')),
      );
  }

  child(_routeOptions: RouteOptions & { path: string; prefix: string }): FastifyRateLimitStore {
    return this;
  }
}
