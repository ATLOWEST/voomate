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
    process.env[key] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
  }
}

const config: NextConfig = {
  reactStrictMode: true,
};

export default config;
