import type { NextConfig } from 'next';

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
