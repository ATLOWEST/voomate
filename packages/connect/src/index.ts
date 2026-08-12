import { containsSensitiveCredential } from './security.js';

export interface SyncMetadata {
  title?: string;
  sourceUrl?: string;
  language?: string;
  tags?: readonly string[];
}

export interface SyncInput {
  /** Secret server key. Never expose this in browser code or a NEXT_PUBLIC_* variable. */
  tenantKey: string;
  /** Freeform descriptive slug such as product, faq, service, or policy. */
  type: string;
  /** Stable developer-owned identifier. Reusing it updates instead of appending. */
  id: string;
  content: string;
  metadata?: SyncMetadata;
  /** Full sync endpoint. Useful for local/staging environments. */
  endpoint?: string;
  /** Per-attempt network timeout. Defaults to 20 seconds. */
  timeoutMs?: number;
  /** Total attempts including the first. Defaults to 3. */
  maxAttempts?: number;
}

export type SyncResult =
  | {
      ok: true;
      status: 'synced' | 'unchanged' | 'processing';
      attempts: number;
      chunks: number;
      embeddingTokens: number;
    }
  | {
      ok: false;
      status: 'failed';
      attempts: number;
      reason: 'invalid_input' | 'unauthorized' | 'rejected' | 'server_error' | 'network_error';
    };

interface SyncResponse {
  ok?: boolean;
  items?: Array<{
    status?: string;
    chunks?: number;
    embeddingTokens?: number;
  }>;
}

const DEFAULT_ENDPOINT = 'https://api.voomate.com/v1/connect/sync';
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const warn = (message: string): void => {
  try {
    console.warn(`[Voomate Connect] ${message}`);
  } catch {
    // Logging is best-effort too. An unusual console implementation must not break a build.
  }
};

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const localValidation = (input: SyncInput): string | undefined => {
  if (!input.tenantKey.startsWith('sk_') || input.tenantKey.length < 20) return 'tenantKey';
  if (!/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(input.type.trim())) return 'type';
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(input.id.trim())) return 'id';
  if (input.content.trim().length === 0 || input.content.length > 200_000) return 'content';
  if (containsSensitiveCredential(input.content)) return 'content security check';
  try {
    const endpoint = new URL(input.endpoint ?? DEFAULT_ENDPOINT);
    const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
    if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && localHost)) {
      return 'endpoint';
    }
    if (endpoint.username || endpoint.password) return 'endpoint';
    if (input.metadata) {
      const encodedMetadata = JSON.stringify(input.metadata);
      if (encodedMetadata.length > 16 * 1024) return 'metadata';
      if (containsSensitiveCredential(encodedMetadata)) return 'metadata security check';
    }
  } catch {
    return 'endpoint';
  }
  return undefined;
};

const reasonFor = (status: number): Extract<SyncResult, { ok: false }>['reason'] => {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 400 || status === 413 || status === 422) return 'rejected';
  return 'server_error';
};

/**
 * Push one content item without ever rejecting the returned promise.
 *
 * Callers may await the result for observability or intentionally ignore it in a deploy hook;
 * either way, Voomate downtime cannot become their application downtime.
 */
export const sync = async (input: SyncInput): Promise<SyncResult> => {
  let attempts = 0;
  try {
    const invalid = localValidation(input);
    if (invalid) {
      warn(`Sync skipped because ${invalid} is invalid. The caller will continue.`);
      return { ok: false, status: 'failed', attempts, reason: 'invalid_input' };
    }

    const endpoint = input.endpoint ?? DEFAULT_ENDPOINT;
    const maxAttempts = Math.min(Math.max(input.maxAttempts ?? 3, 1), 5);
    const timeoutMs = Math.min(Math.max(input.timeoutMs ?? 20_000, 1000), 60_000);
    let lastReason: Extract<SyncResult, { ok: false }>['reason'] = 'network_error';

    while (attempts < maxAttempts) {
      attempts += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${input.tenantKey}`,
            'content-type': 'application/json',
            'user-agent': '@voomate/connect/0.1.0',
          },
          body: JSON.stringify({
            type: input.type.trim(),
            id: input.id.trim(),
            content: input.content,
            metadata: input.metadata ?? {},
          }),
          signal: controller.signal,
          // Never follow a redirect carrying the Authorization header to another origin.
          redirect: 'error',
        });

        let payload: SyncResponse = {};
        try {
          payload = (await response.json()) as SyncResponse;
        } catch {
          // Status controls retry behaviour; an invalid error body is never surfaced or logged.
        }

        const item = payload.items?.[0];
        if (
          response.ok &&
          payload.ok === true &&
          (item?.status === 'synced' ||
            item?.status === 'unchanged' ||
            item?.status === 'processing')
        ) {
          return {
            ok: true,
            status: item.status,
            attempts,
            chunks: item.chunks ?? 0,
            embeddingTokens: item.embeddingTokens ?? 0,
          };
        }

        lastReason = reasonFor(response.status);
        if (!RETRYABLE_STATUS.has(response.status) || attempts >= maxAttempts) break;

        const retryAfterSeconds = Number(response.headers.get('retry-after'));
        const serverDelay = Number.isFinite(retryAfterSeconds)
          ? Math.min(Math.max(retryAfterSeconds * 1000, 0), 5000)
          : 0;
        const backoff = Math.min(250 * 2 ** (attempts - 1) + Math.random() * 100, 5000);
        await sleep(Math.max(serverDelay, backoff));
      } catch {
        lastReason = 'network_error';
        if (attempts >= maxAttempts) break;
        await sleep(Math.min(250 * 2 ** (attempts - 1) + Math.random() * 100, 5000));
      } finally {
        clearTimeout(timeout);
      }
    }

    warn(`Sync gave up after ${String(attempts)} attempt(s). The caller will continue.`);
    return { ok: false, status: 'failed', attempts, reason: lastReason };
  } catch {
    // Includes hostile getters/proxies and unusual JSON implementations. This is the final
    // no-throw boundary promised to applications and deploy pipelines.
    warn('Sync failed unexpectedly. The caller will continue.');
    return { ok: false, status: 'failed', attempts, reason: 'network_error' };
  }
};

export const voomate = Object.freeze({ sync });

export default voomate;
