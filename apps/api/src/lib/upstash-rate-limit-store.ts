import { Redis } from '@upstash/redis';
import type { FastifyRateLimitStore } from '@fastify/rate-limit';
import type { RouteOptions } from 'fastify';

const WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`;

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

/**
 * Shared, atomic fixed-window counter for all API instances. A local memory limiter is easy to
 * bypass by spreading requests across serverless instances or containers, so this store is
 * mandatory in production. Redis errors flow back to Fastify, which rejects the request rather
 * than allowing an unmetered request through.
 */
export class UpstashRateLimitStore implements FastifyRateLimitStore {
  private readonly redis: Redis;
  private readonly timeWindowMs: number;

  constructor(options: { timeWindow?: number | string }) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error('Distributed rate limiting requires Upstash Redis credentials.');
    }
    this.redis = new Redis({ url, token, enableTelemetry: false });
    this.timeWindowMs = durationMs(options.timeWindow);
  }

  incr(
    key: string,
    callback: (error: Error | null, result?: { current: number; ttl: number }) => void,
  ): void {
    void this.redis
      .eval(WINDOW_SCRIPT, [`voomate:rate-limit:${key}`], [String(this.timeWindowMs)])
      .then((result) => {
        if (!Array.isArray(result) || result.length !== 2) {
          throw new Error('Distributed rate limit returned an invalid counter.');
        }
        const current = Number(result[0]);
        const ttl = Number(result[1]);
        if (!Number.isFinite(current) || !Number.isFinite(ttl)) {
          throw new Error('Distributed rate limit returned a non-numeric counter.');
        }
        callback(null, { current, ttl: Math.max(ttl, 0) });
      })
      .catch((error: unknown) =>
        callback(error instanceof Error ? error : new Error('Distributed rate limit failed.')),
      );
  }

  child(_routeOptions: RouteOptions & { path: string; prefix: string }): FastifyRateLimitStore {
    return this;
  }
}
