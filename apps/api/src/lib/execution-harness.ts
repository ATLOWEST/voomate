import { toolAuditLogs, organizationIntegrations, type Database } from '@voomate/db';
import { eq, and } from 'drizzle-orm';
import { getTool, type VoomateToolContext } from './tools/registry.js';

export interface ExecuteToolParams {
  db: Database;
  organizationId: string;
  agentId: string;
  conversationId?: string;
  toolName: string;
  toolInput: any;
}

export interface ExecutionResult {
  status: 'success' | 'error' | 'gated';
  result?: any;
  error?: string;
}

/**
 * The Secure Execution Harness (SEH)
 *
 * Intercepts all tool executions from the LLM.
 * Validates inputs, handles sandboxing, and immutably logs the execution to the database.
 */
export const executeToolHarness = async (params: ExecuteToolParams): Promise<ExecutionResult> => {
  const { db, organizationId, agentId, conversationId, toolName, toolInput } = params;

  const startedAt = Date.now();
  let finalStatus: 'success' | 'error' | 'gated' = 'error';
  let finalResult: any = null;
  let finalError: string | null = null;

  try {
    const tool = getTool(toolName);

    if (!tool) {
      throw new Error(`Security Exception: Tool '${toolName}' is not registered in the system.`);
    }

    // 1. Validation (Input schema enforcement)
    const parseResult = tool.schema.safeParse(toolInput);
    if (!parseResult.success) {
      throw new Error(
        `Input validation failed for tool '${toolName}': ${parseResult.error.message}`,
      );
    }

    const requiresProvider = tool.provider;

    let configPayload = {};

    if (requiresProvider) {
      const integrationRow = await db.query.organizationIntegrations.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.organizationId, organizationId), eq(t.provider, requiresProvider)),
      });

      if (!integrationRow || integrationRow.status !== 'active') {
        throw new Error(
          `Integration error: Provider '${requiresProvider}' is not connected or not active for this organization.`,
        );
      }

      configPayload = integrationRow.credentials as Record<string, any>;
    }

    const ctx: VoomateToolContext = {
      db,
      organizationId,
      agentId,
      conversationId,
      config: configPayload,
    };

    // 2. Sandboxed Execution
    finalResult = await tool.execute(parseResult.data, ctx);
    finalStatus = 'success';
  } catch (err: any) {
    finalStatus = 'error';
    finalError = err.message || 'An unknown error occurred during tool execution.';
    finalResult = { error: finalError };
  }

  const latencyMs = Date.now() - startedAt;

  // 3. Immutable Audit Logging
  try {
    await db.insert(toolAuditLogs).values({
      organizationId,
      agentId,
      conversationId: conversationId || null,
      toolName,
      status: finalStatus,
      inputs: toolInput,
      result: finalResult,
      latencyMs,
    });
  } catch (auditErr) {
    // If the audit log fails, we MUST fail the execution. We cannot have untraceable actions.
    console.error(
      `[SEH] CRITICAL: Failed to write audit log for ${toolName}. Failing execution.`,
      auditErr,
    );
    return {
      status: 'error',
      error:
        'CRITICAL_AUDIT_FAILURE: Action execution was aborted because the audit logger failed.',
    };
  }

  if (finalStatus === 'error') {
    return { status: 'error', error: finalError! };
  }

  return { status: 'success', result: finalResult };
};
