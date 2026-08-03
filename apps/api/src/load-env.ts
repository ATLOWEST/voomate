/**
 * Load the monorepo's root `.env` into `process.env`.
 *
 * Imported for its side effect, first thing in `index.ts`, before anything reads config.
 *
 * Node's own `--env-file` and `process.loadEnvFile()` are not used, and the reason is worth
 * recording: both let an *existing* environment variable win over the file, including one
 * exported as an empty string. Several shells and CI runners export `AWS_REGION=""` and
 * friends, and the resulting failure is a signed request rejected by AWS with "the security
 * token included in the request is invalid" — which reads as a bad credential and sends you
 * looking in entirely the wrong place. Treating empty as unset costs one comparison and
 * removes a whole class of afternoon.
 *
 * In production nothing calls this in anger: the container's environment is already populated
 * by the task definition, there is no `.env` on disk, and the function returns immediately.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const findRootEnv = (): string => {
  // From apps/api/src (dev, via tsx) or apps/api/dist (built). Both are three levels down.
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..', '..', '.env');
};

export const loadRootEnv = (path = findRootEnv()): void => {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

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

    const existing = process.env[key];
    if (existing === undefined || existing === '') process.env[key] = value;
  }
};

loadRootEnv();
