import { agentRunEvents, usageRecords } from '@voomate/db';
import { getWebAgentDb } from './db';

export interface RunContext {
  organizationId: string;
  agentId: string;
  runId: string;
  conversationId?: string;
  eventBuffer?: BufferedRunEvent[];
  usageBuffer?: BufferedUsage[];
}

interface BufferedRunEvent {
  stage: string;
  status: 'started' | 'success' | 'error' | 'denied';
  metadata: Record<string, unknown>;
  latencyMs?: number;
  createdAt: Date;
}

interface BufferedUsage {
  kind: typeof usageRecords.$inferInsert.kind;
  quantity: number;
  createdAt: Date;
}

export function recordRunUsage(
  context: RunContext,
  kind: BufferedUsage['kind'],
  quantity: number | undefined,
): void {
  if (!quantity || quantity <= 0) return;
  const usage = { kind, quantity, createdAt: new Date() };
  if (context.usageBuffer) context.usageBuffer.push(usage);
  else context.usageBuffer = [usage];
}

export async function logRunEvent(
  context: RunContext,
  stage: string,
  status: 'started' | 'success' | 'error' | 'denied',
  metadata: Record<string, unknown> = {},
  latencyMs?: number,
): Promise<void> {
  if (context.eventBuffer) {
    context.eventBuffer.push({
      stage,
      status,
      metadata,
      ...(latencyMs === undefined ? {} : { latencyMs }),
      createdAt: new Date(),
    });
    return;
  }
  await getWebAgentDb().insert(agentRunEvents).values({
    organizationId: context.organizationId,
    agentId: context.agentId,
    runId: context.runId,
    conversationId: context.conversationId,
    stage,
    status,
    metadata,
    latencyMs,
  });
}

/** Write a complete trace in one database round trip without dropping per-stage timestamps. */
export async function flushRunEvents(context: RunContext): Promise<void> {
  const events = context.eventBuffer?.splice(0) ?? [];
  const usage = context.usageBuffer?.splice(0) ?? [];
  if (events.length === 0 && usage.length === 0) return;
  const db = getWebAgentDb();
  await Promise.all([
    events.length === 0
      ? Promise.resolve()
      : db.insert(agentRunEvents).values(
          events.map((event) => ({
            organizationId: context.organizationId,
            agentId: context.agentId,
            runId: context.runId,
            conversationId: context.conversationId,
            stage: event.stage,
            status: event.status,
            metadata: event.metadata,
            latencyMs: event.latencyMs,
            createdAt: event.createdAt,
          })),
        ),
    usage.length === 0
      ? Promise.resolve()
      : db.insert(usageRecords).values(
          usage.map((item) => ({
            organizationId: context.organizationId,
            agentId: context.agentId,
            conversationId: context.conversationId,
            kind: item.kind,
            quantity: item.quantity,
            periodHour: new Date(
              Date.UTC(
                item.createdAt.getUTCFullYear(),
                item.createdAt.getUTCMonth(),
                item.createdAt.getUTCDate(),
                item.createdAt.getUTCHours(),
              ),
            ),
            createdAt: item.createdAt,
          })),
        ),
  ]);
}
