/**
 * Lazily-created database singleton.
 *
 * The connection is established on first use rather than at import time, so the process can
 * boot, serve `/health`, and report a clear "database not configured" error instead of
 * crashing on startup before it can tell anyone why.
 */
import { getSupabaseConfig, isDevelopment } from '../config.js';
import { createDatabase, type Database } from '@voomate/db';

let instance: Database | undefined;

export const getDb = (): Database => {
  instance ??= createDatabase({
    connectionString: getSupabaseConfig().DATABASE_URL,
    debug: isDevelopment,
  });
  return instance;
};
