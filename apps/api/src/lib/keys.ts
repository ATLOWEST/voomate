import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Public embed key. Identifies an agent in the widget snippet.
 *
 * NOT a secret — it ships in the HTML of every page the widget is on. Security comes from
 * server-side origin allowlisting, not from this being hard to guess. It is random anyway so
 * that agents can't be enumerated.
 */
export const generateEmbedKey = (): string => `sq_${randomBytes(18).toString('base64url')}`;

/**
 * Secret API key for the management API. Shown once, then only its hash is stored.
 */
export const generateApiKey = (): { key: string; hash: string; prefix: string } => {
  const key = `sk_${randomBytes(32).toString('base64url')}`;
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 11) };
};

export const hashApiKey = (key: string): string => createHash('sha256').update(key).digest('hex');

/**
 * Constant-time comparison. A plain `===` on a secret leaks its prefix through timing,
 * which is enough to recover a key byte by byte given enough requests.
 */
export const safeEqual = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
};

/**
 * Normalise an origin for allowlist comparison.
 *
 * Returns undefined for anything that isn't a plain http(s) origin, so malformed values
 * fail closed rather than matching something unintended.
 */
export const normalizeOrigin = (value: string): string | undefined => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.origin.toLowerCase();
  } catch {
    return undefined;
  }
};
