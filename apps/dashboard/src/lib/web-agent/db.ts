import { createDatabase } from '@voomate/db';

let database: ReturnType<typeof createDatabase> | undefined;

export function getWebAgentDb(): ReturnType<typeof createDatabase> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required by the Web Agent backend.');
  database ??= createDatabase({ connectionString, maxConnections: 5 });
  return database;
}
