import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

/**
 * The monorepo keeps environment configuration at its root. The marketing app only consumes
 * public widget configuration, so no credential can be bundled into the landing site.
 */
const rootEnv = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');
if (existsSync(rootEnv)) {
  for (const line of readFileSync(rootEnv, 'utf8').split('\n')) {
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    if (!key.startsWith('NEXT_PUBLIC_')) continue;
    const existing = process.env[key];
    if (existing !== undefined && existing !== '') continue;
    process.env[key] = line
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }
}

const staticExport = process.env.LANDING_STATIC_EXPORT === 'true';

const securityHeaders = [
  // The marketing site never needs to be framed; deny clickjacking by default.
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Content-Security-Policy',
    value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const config: NextConfig = {
  reactStrictMode: true,
  // AWS CloudFront and Route 53 serve the marketing site from static assets. Dashboard and API requests
  // are intentionally kept outside this build: they carry authenticated, tenant-scoped traffic.
  ...(staticExport ? { output: 'export' as const, images: { unoptimized: true } } : {}),
  ...(staticExport
    ? {}
    : {
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }];
        },
      }),
};

export default config;
