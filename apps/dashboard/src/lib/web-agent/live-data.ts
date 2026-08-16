import { createHash } from 'node:crypto';
import {
  invokeReadOnlyCapability,
  openConnectionSecret,
  validateReadCapabilityInput,
  type ReadCapabilityManifest,
} from '@voomate/connect/server';
import { readOnlyConnections, readOnlyConnectionSecrets, readOnlyInvocations } from '@voomate/db';
import { and, eq } from 'drizzle-orm';
import { getWebAgentDb } from './db';
import { logRunEvent, recordRunUsage, type RunContext } from './log';
import { authorizeLiveRead } from './live-read-policy';

export interface LiveReadCapability extends ReadCapabilityManifest {
  connectionId: string;
}

function encryptionKey(): string {
  const value = process.env.CONNECT_ENCRYPTION_KEY;
  if (!value || Buffer.from(value, 'base64').byteLength !== 32) {
    throw new Error('Live data is not configured.');
  }
  return value;
}

function manifests(value: unknown): ReadCapabilityManifest[] {
  return Array.isArray(value) ? (value as ReadCapabilityManifest[]) : [];
}

/** Integration Agent boundary: only verified, tenant/agent-bound read capabilities are exposed. */
export async function listLiveReadCapabilities(context: RunContext): Promise<LiveReadCapability[]> {
  const rows = await getWebAgentDb()
    .select({ id: readOnlyConnections.id, capabilities: readOnlyConnections.capabilities })
    .from(readOnlyConnections)
    .where(
      and(
        eq(readOnlyConnections.organizationId, context.organizationId),
        eq(readOnlyConnections.agentId, context.agentId),
        eq(readOnlyConnections.status, 'active'),
      ),
    );
  return rows.flatMap((row) =>
    manifests(row.capabilities).map((capability) => ({
      ...capability,
      connectionId: row.id,
    })),
  );
}

export async function executeLiveRead(
  context: RunContext,
  capability: LiveReadCapability,
  input: Record<string, unknown>,
): Promise<Record<string, unknown> | Array<Record<string, unknown>>> {
  const startedAt = Date.now();
  const db = getWebAgentDb();
  const inputFields = Object.keys(input).sort();
  const inputHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  let outputFields: string[] = [];
  try {
    validateReadCapabilityInput(capability, input);
    const [connection] = await db
      .select({
        organizationId: readOnlyConnections.organizationId,
        agentId: readOnlyConnections.agentId,
        status: readOnlyConnections.status,
        endpointUrl: readOnlyConnections.endpointUrl,
        ciphertext: readOnlyConnectionSecrets.ciphertext,
      })
      .from(readOnlyConnections)
      .innerJoin(
        readOnlyConnectionSecrets,
        eq(readOnlyConnectionSecrets.connectionId, readOnlyConnections.id),
      )
      .where(
        and(
          eq(readOnlyConnections.organizationId, context.organizationId),
          eq(readOnlyConnections.agentId, context.agentId),
          eq(readOnlyConnections.id, capability.connectionId),
          eq(readOnlyConnections.status, 'active'),
        ),
      )
      .limit(1);
    if (!connection) throw new Error('Read capability is unavailable.');
    const authorization = await authorizeLiveRead({
      organizationId: context.organizationId,
      agentId: context.agentId,
      connectionId: capability.connectionId,
      connectionOrganizationId: connection.organizationId,
      connectionAgentId: connection.agentId,
      connectionActive: connection.status === 'active',
      capability,
      inputFields,
    });
    await logRunEvent(context, 'live_read_policy', authorization.allowed ? 'success' : 'denied', {
      capability: capability.name,
      sensitivity: capability.sensitivity,
      inputFields,
      policyVersion: authorization.policyVersion,
      decision: authorization.allowed ? 'allow' : 'deny',
      reason: authorization.reason,
      determiningPolicies: authorization.determiningPolicies,
    });
    if (!authorization.allowed) throw new LiveReadPolicyDeniedError(authorization.reason);
    const secret = openConnectionSecret(connection.ciphertext, encryptionKey());
    recordRunUsage(context, 'live_read_calls', 1);
    const result = await invokeReadOnlyCapability({
      endpoint: connection.endpointUrl,
      connectionId: capability.connectionId,
      secret,
      capability: capability.name,
      input,
      allowInsecureLoopback: process.env.NODE_ENV !== 'production',
    });
    outputFields = result.outputFields;
    await db.transaction(async (tx) => {
      await tx.insert(readOnlyInvocations).values({
        organizationId: context.organizationId,
        agentId: context.agentId,
        connectionId: capability.connectionId,
        conversationId: context.conversationId,
        runId: context.runId,
        capability: capability.name,
        status: 'success',
        inputHash,
        inputFields,
        outputFields,
        latencyMs: Date.now() - startedAt,
      });
      await tx
        .update(readOnlyConnections)
        .set({ lastUsedAt: new Date(), lastErrorCode: null, updatedAt: new Date() })
        .where(
          and(
            eq(readOnlyConnections.organizationId, context.organizationId),
            eq(readOnlyConnections.id, capability.connectionId),
          ),
        );
    });
    await logRunEvent(
      context,
      'integration_live_read',
      'success',
      {
        capability: capability.name,
        inputFields,
        outputFields,
      },
      Date.now() - startedAt,
    );
    return result.data;
  } catch (error) {
    const denied = error instanceof LiveReadPolicyDeniedError;
    recordRunUsage(context, 'tool_failures', 1);
    await db.insert(readOnlyInvocations).values({
      organizationId: context.organizationId,
      agentId: context.agentId,
      connectionId: capability.connectionId,
      conversationId: context.conversationId,
      runId: context.runId,
      capability: capability.name,
      status: denied ? 'gated' : 'error',
      inputHash,
      inputFields,
      outputFields,
      latencyMs: Date.now() - startedAt,
      errorCode: denied ? 'policy_denied' : 'live_read_failed',
    });
    await logRunEvent(
      context,
      'integration_live_read',
      denied ? 'denied' : 'error',
      {
        capability: capability.name,
        inputFields,
        errorCode: denied ? 'policy_denied' : 'live_read_failed',
      },
      Date.now() - startedAt,
    );
    throw error;
  }
}

class LiveReadPolicyDeniedError extends Error {
  constructor(reason: string) {
    super(`Live-read policy denied the request: ${reason}`);
    this.name = 'LiveReadPolicyDeniedError';
  }
}
