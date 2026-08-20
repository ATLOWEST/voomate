/**
 * Environment validation.
 *
 * Boot fails loudly on a missing or malformed variable rather than throwing a confusing
 * `undefined` error deep inside an AWS SDK call at 3am. Every variable in `.env.example`
 * is described here, and this file is the source of truth for that contract.
 *
 * Services are validated in separate schemas so the API can boot for local development
 * without AWS credentials — `parseServerEnv` requires only what the control plane needs,
 * and the AWS-backed schemas are parsed lazily by the components that actually use them.
 */
import { z } from 'zod';

const nonEmpty = (description: string) => z.string().min(1, description);

const csv = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().url()));

// --- Core server -----------------------------------------------------------------------

export const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    API_PORT: z.coerce.number().int().positive().default(4000),
    API_HOST: z.string().default('0.0.0.0'),
    API_CORS_ORIGINS: csv.default('http://localhost:3000,http://localhost:3001'),
    API_TRUST_PROXY_CIDRS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== 'production') return;
    if (!value.UPSTASH_REDIS_REST_URL || !value.UPSTASH_REDIS_REST_TOKEN) {
      context.addIssue({
        code: 'custom',
        path: ['UPSTASH_REDIS_REST_URL'],
        message: 'Production requires Upstash Redis for distributed rate limiting.',
      });
    }
    if (
      value.API_CORS_ORIGINS.length === 0 ||
      value.API_CORS_ORIGINS.some((origin) => !origin.startsWith('https://'))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['API_CORS_ORIGINS'],
        message: 'Production API CORS origins must be explicit HTTPS origins.',
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// --- Supabase --------------------------------------------------------------------------

export const supabaseEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: nonEmpty('Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty('Supabase service role key is required'),
  /**
   * Optional, and preferably left unset.
   *
   * Supabase now signs user tokens with an asymmetric key (ES256) and publishes the public
   * half at `/auth/v1/.well-known/jwks.json`, so the API can verify a signature without
   * holding any secret — and picks up a key rotation on its own. This variable is only the
   * fallback for a project still on the legacy shared HS256 secret. A shared symmetric secret
   * is strictly worse: anything that can verify a token can also mint one.
   */
  SUPABASE_JWT_SECRET: z.string().optional(),
  DATABASE_URL: z.string().url(),
  DATABASE_DIRECT_URL: z.string().url().optional(),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

// --- AWS -------------------------------------------------------------------------------

export const awsEnvSchema = z.object({
  AWS_REGION: z.string().default('us-east-1'),
  // Absent in deployed environments — IAM task roles supply credentials there.
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  BEDROCK_REGION: z.string().default('us-east-1'),
  BEDROCK_MODEL_ID: z.string().default('us.amazon.nova-pro-v1:0'),
  BEDROCK_UTILITY_MODEL_ID: z.string().default('us.amazon.nova-lite-v1:0'),

  /**
   * Embeddings. Vectors live in Postgres (docs/adr/0005-supabase-pgvector.md); AWS's only
   * role in retrieval is producing them.
   *
   * Changing the model or the width invalidates every stored embedding — they must be
   * regenerated, not migrated. Both are pinned here rather than defaulted at the call site
   * so that a change is a visible edit to one line.
   */
  EMBEDDING_MODEL_ID: z.string().default('amazon.titan-embed-text-v2:0'),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1024),

  /** Raw crawl artifacts, so re-chunking doesn't mean re-crawling the merchant's site. */
  CRAWL_ARCHIVE_BUCKET: z.string().optional(),

  TRANSCRIBE_REGION: z.string().default('us-east-1'),
  POLLY_REGION: z.string().default('us-east-1'),
  POLLY_PREFERRED_ENGINE: z.enum(['generative', 'neural', 'standard']).default('generative'),

  CHIME_REGION: z.string().default('us-east-1'),
  CHIME_MEDIA_REGION: z.string().default('us-east-1'),
});

export type AwsEnv = z.infer<typeof awsEnvSchema>;

// --- Widget ----------------------------------------------------------------------------

export const widgetEnvSchema = z.object({
  // 32 bytes minimum. A short signing secret is not a small problem, it is a total bypass.
  WIDGET_TOKEN_SECRET: z.string().min(32, 'Widget token secret must be at least 32 characters'),
  WIDGET_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(900),
  WIDGET_ORIGIN: z.string().url(),
});

export type WidgetEnv = z.infer<typeof widgetEnvSchema>;

// --- Parsing ---------------------------------------------------------------------------

class EnvValidationError extends Error {
  constructor(scope: string, issues: z.ZodIssue[]) {
    const lines = issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    super(
      `Invalid ${scope} environment configuration:\n${lines.join('\n')}\n\n` +
        `See .env.example for the full contract.`,
    );
    this.name = 'EnvValidationError';
  }
}

const parseWith = <T extends z.ZodTypeAny>(
  scope: string,
  schema: T,
  source: NodeJS.ProcessEnv,
): z.infer<T> => {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(scope, result.error.issues);
  }
  return result.data;
};

export const parseServerEnv = (source: NodeJS.ProcessEnv = process.env): ServerEnv =>
  parseWith('server', serverEnvSchema, source);

export const parseSupabaseEnv = (source: NodeJS.ProcessEnv = process.env): SupabaseEnv =>
  parseWith('Supabase', supabaseEnvSchema, source);

export const parseAwsEnv = (source: NodeJS.ProcessEnv = process.env): AwsEnv =>
  parseWith('AWS', awsEnvSchema, source);

export const parseWidgetEnv = (source: NodeJS.ProcessEnv = process.env): WidgetEnv =>
  parseWith('widget', widgetEnvSchema, source);
