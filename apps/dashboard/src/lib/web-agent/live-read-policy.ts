import type { ReadCapabilityManifest } from '@voomate/connect/server';

export const LIVE_READ_POLICY_VERSION = 'live-read-cedar-v1';

const policies = `
@id("permit_tenant_bound_live_read")
permit(
  principal is Voomate::Agent,
  action == Voomate::Action::"ReadLiveCapability",
  resource is Voomate::Connection
)
when {
  principal.tenantId == resource.tenantId &&
  principal.agentId == resource.agentId &&
  resource.active &&
  context.operation == "read" &&
  (
    context.sensitivity == "public" ||
    (context.sensitivity == "customer" && context.verificationComplete)
  )
};

@id("forbid_non_read_operation")
forbid(principal, action, resource)
when { context.operation != "read" };
`;

const schema = {
  Voomate: {
    entityTypes: {
      Agent: {
        shape: {
          type: 'Record' as const,
          attributes: {
            tenantId: { type: 'String' as const, required: true },
            agentId: { type: 'String' as const, required: true },
          },
          additionalAttributes: false,
        },
      },
      Connection: {
        shape: {
          type: 'Record' as const,
          attributes: {
            tenantId: { type: 'String' as const, required: true },
            agentId: { type: 'String' as const, required: true },
            active: { type: 'Boolean' as const, required: true },
          },
          additionalAttributes: false,
        },
      },
    },
    actions: {
      ReadLiveCapability: {
        appliesTo: {
          principalTypes: ['Agent'],
          resourceTypes: ['Connection'],
          context: {
            type: 'Record' as const,
            attributes: {
              operation: { type: 'String' as const, required: true },
              sensitivity: { type: 'String' as const, required: true },
              verificationComplete: { type: 'Boolean' as const, required: true },
            },
            additionalAttributes: false,
          },
        },
      },
    },
  },
};

export interface LiveReadAuthorizationRequest {
  organizationId: string;
  agentId: string;
  connectionId: string;
  connectionOrganizationId: string;
  connectionAgentId: string;
  connectionActive: boolean;
  capability: ReadCapabilityManifest;
  inputFields: readonly string[];
}

export interface LiveReadAuthorizationDecision {
  allowed: boolean;
  policyVersion: string;
  reason: 'permit' | 'default_deny' | 'policy_error';
  determiningPolicies: string[];
}

function verificationComplete(
  capability: ReadCapabilityManifest,
  inputFields: readonly string[],
): boolean {
  const provided = new Set(inputFields);
  return (capability.verificationFields ?? []).every((field) => provided.has(field));
}

/**
 * Deterministic authorization outside model reasoning. Cedar denies by default when no permit
 * matches, and any parse/evaluation failure is converted to a denial.
 */
export async function authorizeLiveRead(
  request: LiveReadAuthorizationRequest,
): Promise<LiveReadAuthorizationDecision> {
  try {
    const cedar = await import('@cedar-policy/cedar-wasm/nodejs');
    const answer = cedar.isAuthorized({
      principal: { type: 'Voomate::Agent', id: `${request.organizationId}:${request.agentId}` },
      action: { type: 'Voomate::Action', id: 'ReadLiveCapability' },
      resource: { type: 'Voomate::Connection', id: request.connectionId },
      context: {
        operation: 'read',
        sensitivity: request.capability.sensitivity,
        verificationComplete: verificationComplete(request.capability, request.inputFields),
      },
      schema,
      validateRequest: true,
      policies: { staticPolicies: policies },
      entities: [
        {
          uid: {
            type: 'Voomate::Agent',
            id: `${request.organizationId}:${request.agentId}`,
          },
          attrs: { tenantId: request.organizationId, agentId: request.agentId },
          parents: [],
        },
        {
          uid: { type: 'Voomate::Connection', id: request.connectionId },
          attrs: {
            tenantId: request.connectionOrganizationId,
            agentId: request.connectionAgentId,
            active: request.connectionActive,
          },
          parents: [],
        },
      ],
    });
    if (answer.type !== 'success') {
      return {
        allowed: false,
        policyVersion: LIVE_READ_POLICY_VERSION,
        reason: 'policy_error',
        determiningPolicies: [],
      };
    }
    return {
      allowed: answer.response.decision === 'allow',
      policyVersion: LIVE_READ_POLICY_VERSION,
      reason: answer.response.decision === 'allow' ? 'permit' : 'default_deny',
      determiningPolicies: answer.response.diagnostics.reason,
    };
  } catch {
    return {
      allowed: false,
      policyVersion: LIVE_READ_POLICY_VERSION,
      reason: 'policy_error',
      determiningPolicies: [],
    };
  }
}
