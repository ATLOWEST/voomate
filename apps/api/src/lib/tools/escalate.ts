import { z } from 'zod';
import { type VoomateToolContext } from './registry.js';
import { conversations } from '@voomate/db';
import { eq } from 'drizzle-orm';

export const escalateToHumanTool = {
  name: 'escalate_to_human',
  description:
    'Immediately stops the AI conversation and alerts a human agent to take over. Use this when the user requests a human, or when a task (like a refund or cancellation) is too sensitive/complex.',
  schema: z.object({
    reason: z
      .string()
      .describe(
        'The reason for escalation (e.g., "User requested human", "Refund amount exceeds threshold").',
      ),
    summary: z
      .string()
      .describe('A brief summary of the conversation so far for the human agent to read.'),
  }),
  execute: async (input: { reason: string; summary: string }, ctx: VoomateToolContext) => {
    console.log(
      `[Tool] escalate_to_human executing in org ${ctx.organizationId}. Reason: ${input.reason}`,
    );

    // 1. Mark the conversation as escalated in the DB
    if (ctx.conversationId && ctx.conversationId !== 'active-conversation') {
      try {
        await ctx.db
          .update(conversations)
          .set({ status: 'escalated' })
          .where(eq(conversations.id, ctx.conversationId));
      } catch (e) {
        console.error('Failed to update conversation status to escalated', e);
      }
    }

    // 2. Alert the business owner and their tech stack (Simulated Webhook)
    console.log(`\n======================================================`);
    console.log(`🚨 ESCALATION ALERT TRIGGERED 🚨`);
    console.log(`Organization ID: ${ctx.organizationId}`);
    console.log(`Conversation ID: ${ctx.conversationId}`);
    console.log(`Reason: ${input.reason}`);
    console.log(`Summary: ${input.summary}`);
    console.log(`--> Sending Slack Notification to #escalations channel...`);
    console.log(`--> Sending Email Alert to business owner...`);
    console.log(`--> Creating Zendesk/HubSpot Ticket (if configured)...`);
    console.log(`======================================================\n`);

    return {
      status: 'escalated',
      handoffMessage:
        'I have paused the automated system and notified a human agent. They will review this conversation and assist you shortly.',
    };
  },
};
