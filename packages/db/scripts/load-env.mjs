/**
 * Load the root `.env`, treating an empty environment variable as unset.
 *
 * Node's `--env-file` deliberately lets the real environment win over the file. That is the
 * right rule for CI, where an injected secret must beat a checked-in default — but it breaks
 * badly when a variable is *exported and empty*, which some shells and sandboxes do for
 * `AWS_ACCESS_KEY_ID` and friends. The file value is then ignored in favour of nothing, and
 * the failure surfaces several layers away as "the security token included in the request is
 * invalid", which points at the credentials rather than at the loading of them.
 *
 * So: a set, non-empty variable still wins. An empty one is treated as absent.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_ENV = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.env');

export const loadEnv = (path = ROOT_ENV) => {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    // Quotes are a way of writing a value, not part of it.
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
