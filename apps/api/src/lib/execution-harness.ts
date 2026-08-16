import { agentActiveTools, agents, conversations, toolAuditLogs, type Database } from '@voomate/db';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getTool, type VoomateToolContext } from './tools/registry.js';

export interface ExecuteToolParams {
  db: Database;
  organizationId: string;
  agentId: string;
  conversationId?: string;
  toolName: string;
  toolInput: unknown;
}

export interface ExecutionResult {
  status: 'success' | 'error' | 'gated';
  result?: unknown;
  error?: string;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : 'An unknown error occurred during tool execution.';

const SECRET_KEY =
  /(?:authorization|cookie|credential|password|private.?key|secret|session|signature|token)/i;

/** Keep audit rows useful without turning them into a second credential store. */
export const redactForAudit = (value: unknown, depth = 0): unknown => {
  if (depth > 6) return '[TRUNCATED]';
  if (typeof value === 'string')
    return value.length > 4_000 ? `${value.slice(0, 4_000)}...` : value;
  if (Array.isArray(value))
    return value.slice(0, 50).map((item) => redactForAudit(item, depth + 1));
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 100)
      .map(([key, child]) => [
        key,
        SECRET_KEY.test(key) ? '[REDACTED]' : redactForAudit(child, depth + 1),
      ]),
  );
};

/**
 * Secure Execution Harness.
 *
 * The model can request a registered tool; it cannot grant that tool to an agent. This function
 * independently verifies lifecycle, tenant, per-agent capability, provider connection, and input
 * shape. A durable authorization intent is written before execution so an audit outage cannot
 * permit an unrecorded side effect.
 */
export const executeToolHarness = async (params: ExecuteToolParams): Promise<ExecutionResult> => {
  const { db, organizationId, agentId, conversationId, toolName, toolInput } = params;
  const startedAt = Date.now();
  let auditedInput: unknown = redactForAudit(toolInput);
  let auditedConversationId: string | null = null;

  const writeAudit = async (
    status: 'success' | 'error' | 'gated',
    result: unknown,
  ): Promise<void> => {
    await db.insert(toolAuditLogs).values({
      organizationId,
      agentId,
      conversationId: auditedConversationId,
      toolName,
      status,
      inputs: auditedInput,
      result: redactForAudit(result),
      latencyMs: Date.now() - startedAt,
    });
  };

  const deny = async (error: unknown): Promise<ExecutionResult> => {
    const message = messageOf(error);
    try {
      await writeAudit('error', { phase: 'authorization', error: message });
    } catch (auditError) {
      console.error('[SEH] CRITICAL: Authorization denial could not be audited.', auditError);
      return {
        status: 'error',
        error: 'CRITICAL_AUDIT_FAILURE: Tool authorization could not be recorded.',
      };
    }
    return { status: 'error', error: message };
  };

  const tool = getTool(toolName);
  if (!tool) return deny(new Error(`Security Exception: Tool '${toolName}' is not registered.`));
  if (tool.implementation === 'placeholder') {
    return deny(new Error(`Security Exception: Tool '${toolName}' is not production-ready.`));
  }

  const parsed = tool.schema.safeParse(toolInput);
  if (!parsed.success) {
    return deny(new Error(`Input validation failed for tool '${toolName}'.`));
  }
  auditedInput = parsed.data;

  if (conversationId && !z.string().uuid().safeParse(conversationId).success) {
    return deny(new Error('Security Exception: Conversation identifier is invalid.'));
  }

  const [agent] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(
      and(
        eq(agents.id, agentId),
        eq(agents.organizationId, organizationId),
        eq(agents.status, 'published'),
      ),
    )
    .limit(1);
  if (!agent) return deny(new Error('Security Exception: Agent is not eligible to execute tools.'));

  if (conversationId) {
    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.organizationId, organizationId),
          eq(conversations.agentId, agentId),
        ),
      )
      .limit(1);
    if (!conversation) {
      return deny(new Error('Security Exception: Conversation is outside this execution scope.'));
    }
    auditedConversationId = conversationId;
  }

  if (tool.builtin !== true) {
    const [grant] = await db
      .select({ status: agentActiveTools.status })
      .from(agentActiveTools)
      .where(
        and(
          eq(agentActiveTools.organizationId, organizationId),
          eq(agentActiveTools.agentId, agentId),
          eq(agentActiveTools.toolName, toolName),
          eq(agentActiveTools.status, 'active'),
        ),
      )
      .limit(1);
    if (!grant) {
      return deny(
        new Error(`Security Exception: Tool '${toolName}' is not enabled for this agent.`),
      );
    }
  }

  let config: Record<string, unknown> = {};
  if (tool.provider) {
    const integration = await db.query.organizationIntegrations.findFirst({
      where: (table, operators) =>
        operators.and(
          operators.eq(table.organizationId, organizationId),
          operators.eq(table.provider, tool.provider!),
          operators.eq(table.status, 'active'),
        ),
    });
    if (!integration) {
      return deny(new Error(`Integration '${tool.provider}' is not connected for this workspace.`));
    }
    config = integration.credentials as Record<string, unknown>;
  }

  // This record must succeed before the tool is allowed to cross the execution boundary.
  try {
    await writeAudit('gated', { phase: 'authorized', executionStarted: false });
  } catch (auditError) {
    console.error(
      '[SEH] CRITICAL: Tool intent could not be audited. Execution blocked.',
      auditError,
    );
    return {
      status: 'error',
      error: 'CRITICAL_AUDIT_FAILURE: Action was blocked before execution.',
    };
  }

  let status: 'success' | 'error' = 'error';
  let result: unknown;
  let executionError: string | undefined;
  try {
    const context: VoomateToolContext = {
      db,
      organizationId,
      agentId,
      conversationId,
      config,
    };
    result = await tool.execute(parsed.data, context);
    status = 'success';
  } catch (error) {
    executionError = messageOf(error);
    result = { error: executionError };
  }

  try {
    await writeAudit(status, {
      phase: 'receipt',
      executionCompleted: true,
      output: result,
    });
  } catch (auditError) {
    // The pre-execution intent is durable, but the external outcome must be reconciled manually.
    console.error('[SEH] CRITICAL: Tool outcome could not be audited.', auditError);
    return {
      status: 'error',
      error: 'CRITICAL_AUDIT_FAILURE: Action outcome is unknown and requires review.',
    };
  }

  return status === 'success'
    ? { status: 'success', result }
    : { status: 'error', error: executionError };
};
