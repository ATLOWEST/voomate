import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

/**
 * Pull the public config out of the monorepo's root `.env`.
 *
 * Next only reads `.env` files inside its own app directory, but this repo keeps one `.env` at
 * the root so the API, the migrations and the dashboard cannot drift apart. Rather than
 * duplicating the file, this reads it here.
 *
 * Browser-safe `NEXT_PUBLIC_*` values and the small server-only allowlist needed by Next.js
 * Route Handlers are copied. Server-only values are never placed in Next's `env` config and
 * therefore are not compiled into browser bundles.
 */
const SERVER_RUNTIME_KEYS = new Set([
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'BEDROCK_MODEL_ID',
  'BEDROCK_LOW_COST_MODEL_ID',
  'BEDROCK_REGION',
  'EMBEDDING_DIMENSIONS',
  'EMBEDDING_MODEL_ID',
  'IMAGE_CLEANUP_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'DATABASE_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'WIDGET_TOKEN_SECRET',
]);

const loadRuntimeEnv = (): void => {
  const rootEnv = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');
  if (!existsSync(rootEnv)) return;

  for (const line of readFileSync(rootEnv, 'utf8').split('\n')) {
    const trimmed = line.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!key.startsWith('NEXT_PUBLIC_') && !SERVER_RUNTIME_KEYS.has(key)) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // An empty existing value counts as unset. The shell exports some of these as empty
    // strings, and `??=` would happily keep the empty string and break the build.
    const existing = process.env[key];
    if (existing === undefined || existing === '') process.env[key] = value;
  }
};

loadRuntimeEnv();

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const config: NextConfig = {
  reactStrictMode: true,
  // Pinned because there is a stray package-lock.json in the user's home directory, and
  // Turbopack's "nearest lockfile wins" inference picks *that* as the workspace root — which
  // silently changes how the workspace packages resolve.
  turbopack: { root: repoRoot },
  // The workspace packages ship TypeScript source, not built JS. Next compiles them itself
  // so we don't need a build step in the dependency graph during development.
  transpilePackages: ['@voomate/core', '@voomate/db', '@voomate/i18n'],
  outputFileTracingIncludes: {
    '/api/web-agent/messages': ['./harness/*.md'],
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          // The dashboard is never embedded anywhere. Anything that frames it is clickjacking.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
        ],
      },
    ];
  },
};

export default config;
