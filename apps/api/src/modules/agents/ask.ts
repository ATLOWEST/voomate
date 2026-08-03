/**
 * The playground: ask an agent a question and watch it answer.
 *
 * This is the merchant-facing loop that has to be good *before* voice is built. A merchant
 * who cannot see what their agent actually knows has no way to tell a thin knowledge base
 * from a broken one, and no way to judge whether the thing is safe to publish. Phase 3 wraps
 * this in speech; it does not replace it.
 *
 * Two response modes on one route:
 *
 *  - `POST /v1/agents/:id/ask` → JSON, once generation finishes. Simple to call, easy to
 *    assert in a test, and what the smoke test uses.
 *  - `POST /v1/agents/:id/ask` with `Accept: text/event-stream` → SSE. What the dashboard
 *    uses, because time-to-first-token is the number that decides whether the agent feels
 *    alive, and it is the number Phase 3 will have to hit with a speech synthesiser attached.
 *
 * Authenticated and tenant-scoped: this is the dashboard's preview, not the public widget
 * endpoint. The widget gets its own route with origin checks and a signed session token.
 */
import {
  OrgRole,
  notFound,
  uuidSchema,
  type AgentLanguageConfig,
  type AgentPersona,
} from '@soniq/core';
import { agents, tenantScope } from '@soniq/db';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDb } from '../../lib/db.js';
import { tenantOf } from '../../plugins/auth.js';
import { answerQuestion, type AnswerResult } from '../../lib/answer.js';

const params = z.object({ id: uuidSchema });

const askSchema = z.object({
  question: z.string().trim().min(1, 'Ask a question.').max(2000),
  /**
   * Prior turns, oldest first, excluding the question being asked. The client owns the
   * transcript in the playground — nothing is persisted, because a merchant testing phrasings
   * is not a conversation anyone should have to clean up afterwards.
   */
  history: z
    .array(
      z.object({
        role: z.enum(['visitor', 'agent']),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .optional(),
  /** Defaults to the agent's primary language. */
  language: z.string().min(2).max(35).optional(),
  /**
   * `voice` applies the spoken-answer rules — no markdown, shorter sentences. Worth exposing
   * in the playground: the text and voice answers to the same question differ enough that
   * reviewing only one of them tells a merchant the wrong thing about the other.
   */
  channel: z.enum(['voice', 'text']).default('text'),
  pageUrl: z.string().url().optional(),
});

/** SSE frame. Named events so the client can switch on type rather than sniff the payload. */
const send = (reply: FastifyReply, event: string, data: unknown): void => {
  reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

export const askRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/:id/ask',
    { preHandler: app.requireTenant(OrgRole.VIEWER) },
    async (request, reply) => {
      const tenant = tenantOf(request);
      const { id } = params.parse(request.params);
      const input = askSchema.parse(request.body);
      const db = getDb();

      const [agent] = await db
        .select()
        .from(agents)
        .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
        .limit(1);

      if (agent === undefined) throw notFound('Agent', id);

      const language = agent.language as AgentLanguageConfig;
      const persona = agent.persona as AgentPersona;

      const common = {
        db,
        organizationId: tenant.organizationId,
        agentId: agent.id as never,
        persona,
        language: input.language ?? language.primaryLanguage,
        channel: input.channel,
        question: input.question,
        ...(input.history !== undefined ? { history: input.history } : {}),
        ...(input.pageUrl !== undefined ? { pageUrl: input.pageUrl } : {}),
      };

      const wantsStream = (request.headers.accept ?? '').includes('text/event-stream');

      if (!wantsStream) {
        const result = await answerQuestion(common);
        return toJson(result);
      }

      // Abort generation when the client disconnects. Without this, closing the playground tab
      // mid-answer leaves Bedrock streaming tokens into a dead socket and billing for all of
      // them — and it is the same mechanism barge-in will use in Phase 3.
      const controller = new AbortController();
      request.raw.on('close', () => {
        controller.abort();
      });

      reply.raw.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        // Nginx and friends buffer by default, which turns a stream back into a single slow
        // response and silently undoes the entire point of this branch.
        'x-accel-buffering': 'no',
      });

      try {
        const result = await answerQuestion({ ...common, signal: controller.signal }, (chunk) => {
          send(reply, 'delta', { text: chunk.delta });
        });
        send(reply, 'done', toJson(result));
      } catch (error) {
        // The stream is already open with a 200, so the error handler cannot turn this into a
        // 500 — the status line is long gone. An error *event* is the only honest way to tell
        // the client, and the client must treat it as a failure rather than an empty answer.
        request.log.error({ err: error, agentId: agent.id }, 'Ask stream failed');
        send(reply, 'error', {
          code: 'answer_failed',
          message: 'The agent could not answer. Please try again.',
        });
      } finally {
        reply.raw.end();
      }

      return reply;
    },
  );
};

/**
 * Latency is part of the response, not a debug detail.
 *
 * The 1.2s speech-to-speech budget is the constraint the whole product is designed around,
 * and Phase 3 cannot be tuned against a number nobody has been watching. Surfacing the
 * breakdown in the playground means a slow retrieval is visible months before a visitor hears
 * it as a pause.
 */
const toJson = (result: AnswerResult) => ({
  answer: result.text,
  citations: result.citations,
  ungrounded: result.ungrounded,
  latency: result.latency,
});
