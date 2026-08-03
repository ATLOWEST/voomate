import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';
import { isDevelopment, serverConfig } from './config.js';
import { askRoutes } from './modules/agents/ask.js';
import { agentRoutes } from './modules/agents/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { knowledgeRoutes } from './modules/knowledge/routes.js';
import { languageRoutes } from './modules/languages/routes.js';
import { organizationRoutes } from './modules/organizations/routes.js';
import { widgetRoutes } from './modules/widget/routes.js';
import { authPlugin } from './plugins/auth.js';
import { errorHandler } from './plugins/error-handler.js';

export const buildServer = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: serverConfig.LOG_LEVEL,
      // Pretty output locally; structured JSON in deployed environments where it's parsed.
      ...(isDevelopment
        ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } } }
        : {}),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'res.headers["set-cookie"]',
        ],
        censor: '[redacted]',
      },
    },
    // Trust the proxy in front of us (ALB/CloudFront) so client IPs are accurate. Rate
    // limiting keys on IP, so getting this wrong makes limits either useless or global.
    trustProxy: true,
    // Voice sessions send small control payloads; large bodies indicate abuse.
    bodyLimit: 1_048_576,
  });

  await app.register(errorHandler);
  await app.register(sensible);
  await app.register(helmet, {
    // The API serves JSON, never HTML, so CSP here protects nothing and complicates
    // nothing. The widget iframe sets its own, which is where it matters.
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    // Never `*`. The dashboard's origins are known; the widget's per-agent origins are
    // checked separately, per-request, inside the widget routes.
    origin: serverConfig.API_CORS_ORIGINS,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
  });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    // Per-tenant where we know the tenant, per-IP otherwise. Without the tenant key, one
    // busy merchant's visitors would exhaust the limit for everyone behind a shared NAT.
    keyGenerator: (request) => request.tenant?.organizationId ?? request.ip,
  });

  await app.register(authPlugin);

  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(languageRoutes, { prefix: '/v1/languages' });
  await app.register(organizationRoutes, { prefix: '/v1/organizations' });
  await app.register(agentRoutes, { prefix: '/v1/agents' });
  await app.register(askRoutes, { prefix: '/v1/agents' });
  await app.register(knowledgeRoutes, { prefix: '/v1/agents' });
  await app.register(widgetRoutes, { prefix: '/v1/widget' });

  return app;
};
