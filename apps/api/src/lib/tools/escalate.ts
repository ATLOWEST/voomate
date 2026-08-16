import { z } from 'zod';
import { type VoomateToolContext } from './registry.js';
import { conversations } from '@voomate/db';
import { and, eq } from 'drizzle-orm';

export const escalateToHumanTool = {
  name: 'escalate_to_human',
  builtin: true,
  description:
    'Pauses a persisted AI conversation for review by a human. Use this when the user requests a human, or when a task is too sensitive or complex.',
  schema: z
    .object({
      reason: z
        .string()
        .describe(
          'The reason for escalation (e.g., "User requested human", "Refund amount exceeds threshold").',
        ),
      summary: z
        .string()
        .describe('A brief summary of the conversation so far for the human agent to read.'),
    })
    .strict(),
  execute: async (_input: { reason: string; summary: string }, ctx: VoomateToolContext) => {
    if (!ctx.conversationId) {
      throw new Error('Human handoff requires a persisted conversation.');
    }

    const updated = await ctx.db
      .update(conversations)
      .set({ status: 'escalated' })
      .where(
        and(
          eq(conversations.id, ctx.conversationId),
          eq(conversations.organizationId, ctx.organizationId),
          eq(conversations.agentId, ctx.agentId),
        ),
      )
      .returning({ id: conversations.id });
    if (updated.length !== 1) throw new Error('Conversation could not be paused for handoff.');

    return {
      status: 'escalated',
      handoffMessage:
        'I have paused this conversation for the support team to review. They can continue from the same history.',
    };
  },
};
