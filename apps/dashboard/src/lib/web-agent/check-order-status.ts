import { and, eq, sql } from 'drizzle-orm';
import { agentActiveTools, toolAuditLogs, webAgentOrders } from '@voomate/db';
import { z } from 'zod';
import { getWebAgentDb } from './db';
import { logRunEvent, type RunContext } from './log';

export const checkOrderInputSchema = z.object({
  orderId: z.string().trim().min(3).max(80),
  email: z.string().trim().email().max(320),
});

export type PublicOrderStatus = {
  orderId: string;
  status: string;
  orderDate: string;
  estimatedDelivery?: string;
  carrier?: string;
  trackingNumber?: string;
};

/** Explicit allowlist: this is the only shape Nova and the visitor are permitted to see. */
export function toPublicOrderStatus(row: typeof webAgentOrders.$inferSelect): PublicOrderStatus {
  return {
    orderId: row.externalOrderId,
    status: row.status,
    orderDate: row.orderDate.toISOString(),
    ...(row.estimatedDelivery ? { estimatedDelivery: row.estimatedDelivery.toISOString() } : {}),
    ...(row.carrier ? { carrier: row.carrier } : {}),
    ...(row.trackingNumber ? { trackingNumber: row.trackingNumber } : {}),
  };
}

function maskEmail(value: string): string {
  const [name = '', domain = ''] = value.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

export async function checkOrderStatus(
  context: RunContext,
  untrustedInput: unknown,
): Promise<PublicOrderStatus | { found: false }> {
  const startedAt = Date.now();
  const db = getWebAgentDb();
  const parsed = checkOrderInputSchema.safeParse(untrustedInput);
  if (!parsed.success) {
    await logRunEvent(context, 'tool_input_validation', 'denied', {
      tool: 'check_order_status',
      reason: 'invalid_input',
    });
    throw new Error('Order ID and the checkout email are required.');
  }

  await logRunEvent(context, 'tool_input_validation', 'success', {
    tool: 'check_order_status',
  });

  const [permission] = await db
    .select({ status: agentActiveTools.status })
    .from(agentActiveTools)
    .where(
      and(
        eq(agentActiveTools.organizationId, context.organizationId),
        eq(agentActiveTools.agentId, context.agentId),
        eq(agentActiveTools.toolName, 'check_order_status'),
      ),
    )
    .limit(1);
  if (permission?.status !== 'active') {
    await logRunEvent(context, 'tool_permission_check', 'denied', {
      tool: 'check_order_status',
    });
    throw new Error('This assistant is not permitted to check orders.');
  }

  await logRunEvent(context, 'tool_permission_check', 'success', {
    tool: 'check_order_status',
  });

  const [order] = await db
    .select()
    .from(webAgentOrders)
    .where(
      and(
        eq(webAgentOrders.organizationId, context.organizationId),
        eq(webAgentOrders.externalOrderId, parsed.data.orderId),
        sql`lower(${webAgentOrders.verificationEmail}) = ${parsed.data.email.toLowerCase()}`,
      ),
    )
    .limit(1);

  const publicResult = order ? toPublicOrderStatus(order) : { found: false as const };
  const latencyMs = Date.now() - startedAt;

  // The audit row also receives only allowlisted output; internal notes and cost never leave
  // the controlled tool implementation.
  await db.insert(toolAuditLogs).values({
    organizationId: context.organizationId,
    agentId: context.agentId,
    conversationId: context.conversationId,
    toolName: 'check_order_status',
    status: 'success',
    inputs: { orderId: parsed.data.orderId, email: maskEmail(parsed.data.email) },
    result: publicResult,
    latencyMs,
  });
  await logRunEvent(
    context,
    'tool_output_filter',
    'success',
    { tool: 'check_order_status', allowedFields: Object.keys(publicResult) },
    latencyMs,
  );
  return publicResult;
}
