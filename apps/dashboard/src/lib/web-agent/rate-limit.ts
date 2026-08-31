type Bucket = { count: number; resetAt: number };

const localBuckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const MAX_ACCESS_CHECKS = 120;
const MAX_IMAGE_UPLOADS = 6;
const MAX_MODEL_REQUESTS = Number(process.env.BEDROCK_MAX_REQUESTS_PER_MINUTE ?? 20);

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

/**
 * Shared provider admission control. Per-visitor limits prevent one browser from flooding the
 * system; this separate distributed bucket keeps every ECS task together below the configured
 * Bedrock account quota. Set the value from the approved Bedrock quota, not a local benchmark.
 */
export async function enforceBedrockModelCapacity(model: string): Promise<void> {
  if (!Number.isInteger(MAX_MODEL_REQUESTS) || MAX_MODEL_REQUESTS < 1) {
    throw new Error('Invalid BEDROCK_MAX_REQUESTS_PER_MINUTE configuration.');
  }
  const modelKey = model.replace(/[^a-z0-9:_-]+/gi, '_').slice(0, 160);
  try {
    await enforceRateLimit(`bedrock:${modelKey}`, MAX_MODEL_REQUESTS, 1);
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMITED') {
      throw new Error('MODEL_CAPACITY');
    }
    throw error;
  }
}
