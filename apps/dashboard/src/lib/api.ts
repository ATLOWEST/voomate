/**
 * Typed client for the control-plane API.
 *
 * Two rules this file exists to enforce:
 *
 *  1. The organization ID travels in the `x-organization-id` header on every request. The API
 *     will not infer it from the session — see apps/api/src/plugins/auth.ts. Forgetting it
 *     produces a 403, not a silent read of the wrong tenant.
 *  2. Nothing here ever sees the Supabase service-role key. This code runs in the browser.
 *     The only credential it holds is the user's own access token.
 */
import { type ErrorResponse } from '@voomate/core';

/**
 * Exported because the playground bypasses `call()` — it needs a streaming response body,
 * which this helper deliberately does not expose (every other endpoint returns JSON, and a
 * client that sometimes returns a stream is a client nobody can type).
 */
// Browser requests stay on the dashboard's own HTTPS origin (`/api`). Next.js forwards them
// to the private ECS service, so there is no public `api.atlowest.in` hostname to attack or
// maintain. Server components can use the private DNS name directly and avoid an unnecessary
// trip through the public load balancer.
export const API_BASE_URL =
  typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');

const BASE_URL = API_BASE_URL;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body: ErrorResponse) {
    super(body.error.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.error.code;
    this.details = body.error.details;
  }
}

export interface RequestOptions {
  /** Supabase access token. Omitted only for unauthenticated endpoints like /health. */
  accessToken?: string;
  organizationId?: string;
  signal?: AbortSignal;
}

interface CallOptions extends RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function call<T>(path: string, options: CallOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken, organizationId, signal } = options;

  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (accessToken !== undefined) headers.authorization = `Bearer ${accessToken}`;
  if (organizationId !== undefined) headers['x-organization-id'] = organizationId;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
    // Auth is a bearer token, not a cookie. Sending credentials would require the API to
    // relax CORS in ways that make CSRF possible.
    credentials: 'omit',
  });

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    // Fall back to a synthetic error when the response body isn't our shape — a proxy or
    // load balancer error page, most likely.
    throw new ApiError(
      response.status,
      isErrorResponse(payload)
        ? payload
        : { error: { code: 'internal_error', message: response.statusText } },
    );
  }

  return payload as T;
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value as { error: unknown };
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => call<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    call<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    call<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    call<T>(path, { ...options, method: 'DELETE' }),
};
