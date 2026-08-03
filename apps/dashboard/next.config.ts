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
 * Only `NEXT_PUBLIC_*` keys are copied, deliberately. The root file also holds the Supabase
 * service-role key and the AWS credentials; loading those into the dashboard's process would
 * put secrets one careless `process.env` reference away from a server component that renders
 * them. The dashboard has no legitimate use for any of them.
 */
const loadPublicEnv = (): void => {
  const rootEnv = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');
  if (!existsSync(rootEnv)) return;

  for (const line of readFileSync(rootEnv, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('NEXT_PUBLIC_')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
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

loadPublicEnv();

const config: NextConfig = {
  reactStrictMode: true,
  // The workspace packages ship TypeScript source, not built JS. Next compiles them itself
  // so we don't need a build step in the dependency graph during development.
  transpilePackages: ['@soniq/core', '@soniq/i18n'],
  async headers() {
    return [
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
