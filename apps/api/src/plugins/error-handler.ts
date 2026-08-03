/**
 * Centralised error handling.
 *
 * One rule: internal detail never crosses the wire. Merchant website visitors must not see
 * database errors, stack traces, or upstream AWS messages — those are logged, and the client
 * receives a stable error code plus a safe message.
 */
import { AppError, ErrorCode, type ErrorResponse } from '@soniq/core';
import type { FastifyError, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { isProduction } from '../config.js';

export const errorHandler = fp(async (app: FastifyInstance) => {
  app.setNotFoundHandler((request, reply) => {
    const body: ErrorResponse = {
      error: {
        code: ErrorCode.NOT_FOUND,
        message: `Route ${request.method} ${request.url} not found.`,
      },
    };
    reply.status(404).send(body);
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    // Zod failures carry field-level detail that is genuinely useful to the caller and
    // contains nothing sensitive — it's a description of their own input.
    if (error instanceof ZodError) {
      request.log.info({ issues: error.issues }, 'Request validation failed');
      const body: ErrorResponse = {
        error: {
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Request validation failed.',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      };
      reply.status(400).send(body);
      return;
    }

    if (error instanceof AppError) {
      // 5xx means we broke something — log at error with full context. 4xx is the caller's
      // problem and would otherwise flood the logs, so it goes to info.
      const log = error.status >= 500 ? request.log.error : request.log.info;
      log.call(
        request.log,
        { err: error, code: error.code, context: error.context },
        error.message,
      );
      reply.status(error.status).send(error.toResponse());
      return;
    }

    // Fastify's own errors (payload too large, malformed JSON, rate limit) carry a
    // statusCode. Anything with a 4xx status is safe to relay.
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status < 500) {
      request.log.info({ err: error }, 'Client error');
      const body: ErrorResponse = {
        error: { code: ErrorCode.MALFORMED_REQUEST, message: error.message },
      };
      reply.status(status).send(body);
      return;
    }

    request.log.error({ err: error }, 'Unhandled error');
    const body: ErrorResponse = {
      error: {
        code: ErrorCode.INTERNAL,
        // In development the real message is far more useful than a generic one, and
        // there is no untrusted audience. In production it is never exposed.
        message: isProduction ? 'An unexpected error occurred.' : error.message,
      },
    };
    reply.status(500).send(body);
  });
});
