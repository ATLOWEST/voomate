type Bucket = { count: number; resetAt: number };

const localBuckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const MAX_ACCESS_CHECKS = 120;
const MAX_IMAGE_UPLOADS = 6;

function consumeLocalBucket(key: string, maximum: number, weight: number): void {
  const now = Date.now();
  const bucket = localBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    localBuckets.set(key, { count: weight, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += weight;
  if (bucket.count > maximum) throw new Error('RATE_LIMITED');
}

async function enforceRateLimit(key: string, maximum: number, weight: number): Promise<void> {
  if (!Number.isInteger(weight) || weight < 1) throw new Error('Invalid rate-limit weight.');
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    try {
      const redisKey = `web-agent:rate:${key}`;
      const response = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: { authorization: `Bearer ${redisToken}`, 'content-type': 'application/json' },
        body: JSON.stringify([
          ['INCRBY', redisKey, weight],
          ['PEXPIRE', redisKey, WINDOW_MS, 'NX'],
        ]),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Rate-limit service unavailable.');
      const result = (await response.json()) as Array<{ result?: number }>;
      if ((result[0]?.result ?? maximum + 1) > maximum) throw new Error('RATE_LIMITED');
      return;
    } catch (error) {
      if (process.env.NODE_ENV !== 'development') throw error;
      // Local development stays usable when a copied Redis configuration is unreachable.
      // Production never takes this path: it remains distributed and fail-closed.
      console.warn(JSON.stringify({ event: 'web_agent_rate_limit_local_fallback' }));
    }
  }

  consumeLocalBucket(key, maximum, weight);
}

/** Per public-key + embedding-domain limiter. Redis is used in production; memory is dev-only. */
export async function enforceWidgetRateLimit(key: string): Promise<void> {
  await enforceRateLimit(`requests:${key}`, MAX_REQUESTS, 1);
}

/** Lightweight policy heartbeat. It cannot mint a token or execute an agent turn. */
export async function enforceWidgetAccessRateLimit(key: string): Promise<void> {
  await enforceRateLimit(`access:${key}`, MAX_ACCESS_CHECKS, 1);
}

/** Separate weighted limiter: six image files per public key + origin + session per minute. */
export async function enforceImageUploadRateLimit(key: string, imageCount: number): Promise<void> {
  await enforceRateLimit(`images:${key}`, MAX_IMAGE_UPLOADS, imageCount);
}
