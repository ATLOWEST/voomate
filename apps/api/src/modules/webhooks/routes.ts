import { createHmac, timingSafeEqual } from 'node:crypto';
import { AgentStatus } from '@voomate/core';
import { agents } from '@voomate/db';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../../lib/db.js';
import { getMessageQueue } from '../../lib/queue.js';

const MAX_WEBHOOK_BYTES = 256 * 1024;
const SIGNATURE = /^sha256=([a-f0-9]{64})$/i;

const whatsappPayloadSchema = z
  .object({
    organizationId: z.string().uuid(),
    agentId: z.string().uuid(),
    from: z.string().trim().min(1).max(80),
    text: z.string().trim().min(1).max(4_000),
  })
  .strict();

export function verifyWhatsAppSignature(
  body: Uint8Array,
  signatureHeader: string | undefined,
  secret: string | undefined,
): boolean {
  if (!secret || secret.length < 32 || !signatureHeader) return false;
  const match = SIGNATURE.exec(signatureHeader);
  if (!match?.[1]) return false;

  const expected = createHmac('sha256', secret).update(body).digest();
  const provided = Buffer.from(match[1], 'hex');
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Signature verification must use the exact provider bytes, before JSON parsing.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: MAX_WEBHOOK_BYTES },
    (_request, body, done) => done(null, body),
  );

  app.post(
    '/whatsapp',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const rawBody = request.body;
      if (!Buffer.isBuffer(rawBody)) {
        return reply.code(400).send({ error: 'Invalid webhook payload.' });
      }

      const signature = request.headers['x-hub-signature-256'];
      const signatureHeader = typeof signature === 'string' ? signature : undefined;
      if (!verifyWhatsAppSignature(rawBody, signatureHeader, process.env.WHATSAPP_WEBHOOK_SECRET)) {
        request.log.warn({ event: 'whatsapp_webhook_denied' }, 'Webhook signature rejected');
        return reply.code(401).send({ error: 'Webhook authentication failed.' });
      }

      let payload: z.infer<typeof whatsappPayloadSchema>;
      try {
        payload = whatsappPayloadSchema.parse(JSON.parse(rawBody.toString('utf8')));
      } catch {
        return reply.code(400).send({ error: 'Invalid webhook payload.' });
      }

      const [agent] = await getDb()
        .select({
          id: agents.id,
          organizationId: agents.organizationId,
          persona: agents.persona,
          language: agents.language,
        })
        .from(agents)
        .where(
          and(
            eq(agents.id, payload.agentId),
            eq(agents.organizationId, payload.organizationId),
            eq(agents.status, AgentStatus.PUBLISHED),
          ),
        )
        .limit(1);

      // Do not distinguish a missing, cross-tenant, paused, or draft agent.
      if (!agent) return reply.code(404).send({ error: 'Destination unavailable.' });

      const job = await getMessageQueue().add('whatsapp-message', {
        organizationId: agent.organizationId,
        agentId: agent.id,
        persona: agent.persona,
        language: agent.language || 'en-US',
        channel: 'text',
        question: payload.text,
        history: [],
      });

      request.log.info(
        { jobId: job.id, organizationId: agent.organizationId, agentId: agent.id },
        'Queued authenticated WhatsApp message',
      );
      return reply.code(200).send({ success: true, queued: true });
    },
  );
};
