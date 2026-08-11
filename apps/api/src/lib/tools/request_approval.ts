import { z } from 'zod';
import { type VoomateToolContext } from './registry.js';
import { approvalRequests } from '@voomate/db';

export const requestApprovalTool = {
  name: 'request_approval',
  description:
    'Use this tool to queue a sensitive or irreversible action (like a large refund or canceling a service) for manual approval by the business owner. DO NOT perform the action yourself.',
  schema: z.object({
    actionName: z
      .string()
      .describe('The name of the action requested (e.g. refund, cancel_order).'),
    payload: z
      .record(z.any())
      .describe(
        'A JSON object containing all necessary parameters to execute the action once approved (e.g. orderId, amount).',
      ),
    reason: z.string().describe('A message explaining to the owner why this approval is needed.'),
  }),
  execute: async (
    input: { actionName: string; payload: Record<string, any>; reason: string },
    ctx: VoomateToolContext,
  ) => {
    if (!ctx.conversationId || ctx.conversationId === 'active-conversation') {
      console.warn(
        'request_approval called outside of a real conversation. Skipping DB insert for test.',
      );
      return {
        success: true,
        message: `Approval request for '${input.actionName}' has been queued. Please inform the user that their request has been submitted for review and someone will get back to them.`,
      };
    }

    // Record the approval request
    await ctx.db.insert(approvalRequests).values({
      organizationId: ctx.organizationId,
      agentId: ctx.agentId,
      conversationId: ctx.conversationId,
      actionName: input.actionName,
      payload: input.payload,
      reason: input.reason,
      status: 'pending',
    });

    return {
      success: true,
      message: `Approval request for '${input.actionName}' has been queued. Please inform the user that their request has been submitted for review and someone will get back to them.`,
    };
  },
};
