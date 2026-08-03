import { sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../../lib/db.js';

/**
 * Liveness and readiness are genuinely different questions and must not share an endpoint.
 *
 * `/health` — is the process alive? Used by the load balancer. Must never touch a
 *   dependency: if the database blips, we do not want every task killed and restarted.
 * `/health/ready` — can we actually serve traffic? Used by deploy gates.
 */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  app.get('/ready', async (_request, reply) => {
    const checks: Record<string, 'ok' | 'unavailable'> = {};

    try {
      await getDb().execute(sql`select 1`);
      checks.database = 'ok';
    } catch (error) {
      app.log.warn({ err: error }, 'Readiness check: database unavailable');
      checks.database = 'unavailable';
    }

    const ready = Object.values(checks).every((value) => value === 'ok');
    reply.status(ready ? 200 : 503);
    return { ready, checks };
  });
};
