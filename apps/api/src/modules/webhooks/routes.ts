import type { FastifyPluginAsync } from 'fastify';
import { messageQueue } from '../../lib/queue.js';
import { z } from 'zod';
import { getDb } from '../../lib/db.js';
import { agents } from '@voomate/db';
import { eq } from 'drizzle-orm';

const whatsappPayloadSchema = z.object({
  organizationId: z.string().uuid(),
  agentId: z.string().uuid(),
  from: z.string(),
  text: z.string(),
});

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.post('/whatsapp', async (request, reply) => {
    const payload = whatsappPayloadSchema.parse(request.body);
    const db = getDb();

    // Verify agent exists
    const [agent] = await db.select().from(agents).where(eq(agents.id, payload.agentId)).limit(1);

    if (!agent) {
      return reply.code(404).send({ error: 'Agent not found' });
    }

    // Push the incoming WhatsApp message to the BullMQ queue
    const jobId = await messageQueue.add('whatsapp-message', {
      organizationId: payload.organizationId,
      agentId: payload.agentId,
      persona: agent.persona,
      language: agent.language || 'en-US',
      channel: 'text',
      question: payload.text,
      history: [], // We would fetch history from DB here for WhatsApp
    });

    app.log.info({ jobId: jobId.id }, 'Queued WhatsApp message');

    // Return a 200 immediately to WhatsApp so they don't timeout/retry
    return reply.code(200).send({ success: true, queued: true, jobId: jobId.id });
  });
};
