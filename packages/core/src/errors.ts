/**
 * Error taxonomy.
 *
 * Every error crossing the API boundary is an `AppError` with a stable machine-readable
 * `code`. Clients switch on the code; humans read the message. The two are separate on
 * purpose — messages get reworded, codes are a contract.
 *
 * `expose` decides whether the message reaches the client. Internal failures must not leak
 * database errors or stack traces to a merchant's website visitor.
 */

export const ErrorCode = {
  // 400 — the caller sent something wrong
  VALIDATION_FAILED: 'validation_failed',
  MALFORMED_REQUEST: 'malformed_request',
  UNSUPPORTED_LANGUAGE: 'unsupported_language',
  INVALID_LANGUAGE_SET: 'invalid_language_set',

  // 401 / 403 — who you are, and what you may do
  UNAUTHENTICATED: 'unauthenticated',
  INVALID_TOKEN: 'invalid_token',
  TOKEN_EXPIRED: 'token_expired',
  FORBIDDEN: 'forbidden',
  INSUFFICIENT_ROLE: 'insufficient_role',
  ORIGIN_NOT_ALLOWED: 'origin_not_allowed',

  // 404 / 409
  NOT_FOUND: 'not_found',
  ALREADY_EXISTS: 'already_exists',
  CONFLICT: 'conflict',

  // 422 — well-formed but not actionable
  AGENT_NOT_PUBLISHED: 'agent_not_published',
  /** The agent has no indexed content to answer from yet. */
  KNOWLEDGE_NOT_INDEXED: 'knowledge_not_indexed',
  CRAWL_FAILED: 'crawl_failed',

  // 429
  RATE_LIMITED: 'rate_limited',
  QUOTA_EXCEEDED: 'quota_exceeded',

  // 5xx
  INTERNAL: 'internal_error',
  UPSTREAM_UNAVAILABLE: 'upstream_unavailable',
  UPSTREAM_TIMEOUT: 'upstream_timeout',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface AppErrorOptions {
  /** HTTP status to return. */
  status?: number;
  /** Safe to show the end user? Defaults to true for 4xx, false for 5xx. */
  expose?: boolean;
  /** Structured context for logs. Never serialised to the client. */
  context?: Record<string, unknown>;
  /** The underlying error, preserved for logging. */
  cause?: unknown;
}

const DEFAULT_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.MALFORMED_REQUEST]: 400,
  [ErrorCode.UNSUPPORTED_LANGUAGE]: 400,
  [ErrorCode.INVALID_LANGUAGE_SET]: 400,
  [ErrorCode.UNAUTHENTICATED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INSUFFICIENT_ROLE]: 403,
  [ErrorCode.ORIGIN_NOT_ALLOWED]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.AGENT_NOT_PUBLISHED]: 422,
  [ErrorCode.KNOWLEDGE_NOT_INDEXED]: 422,
  [ErrorCode.CRAWL_FAILED]: 422,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.QUOTA_EXCEEDED]: 429,
  [ErrorCode.INTERNAL]: 500,
  [ErrorCode.UPSTREAM_UNAVAILABLE]: 503,
  [ErrorCode.UPSTREAM_TIMEOUT]: 504,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly expose: boolean;
  readonly context: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code];
    this.expose = options.expose ?? this.status < 500;
    this.context = options.context;
    Error.captureStackTrace?.(this, AppError);
  }

  /** The client-facing shape. Never includes `context` or the cause chain. */
  toResponse(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.expose ? this.message : 'An unexpected error occurred.',
      },
    };
  }
}

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    /** Field-level detail, present only for validation failures. */
    details?: Array<{ path: string; message: string }>;
  };
}

// --- Constructors for the cases we raise most often ------------------------------------

export const notFound = (resource: string, id?: string): AppError =>
  new AppError(ErrorCode.NOT_FOUND, `${resource} not found.`, {
    context: id !== undefined ? { resource, id } : { resource },
  });

export const forbidden = (reason = 'You do not have access to this resource.'): AppError =>
  new AppError(ErrorCode.FORBIDDEN, reason);

export const unauthenticated = (reason = 'Authentication required.'): AppError =>
  new AppError(ErrorCode.UNAUTHENTICATED, reason);

export const conflict = (message: string): AppError => new AppError(ErrorCode.CONFLICT, message);

export const internal = (message: string, cause?: unknown): AppError =>
  new AppError(ErrorCode.INTERNAL, message, { cause, expose: false });

export const isAppError = (err: unknown): err is AppError => err instanceof AppError;
