export const AgentCatalogType = {
  WEB: 'web',
  CRM: 'crm',
  SEO: 'seo',
  CALLING: 'calling',
} as const;

export type AgentCatalogType = (typeof AgentCatalogType)[keyof typeof AgentCatalogType];

export interface AgentCatalogDefinition {
  id: AgentCatalogType;
  version: number;
  name: string;
  description: string;
  releaseState: 'released' | 'design' | 'planned';
  supportedChannels: ReadonlyArray<'web' | 'voice' | 'email' | 'whatsapp' | 'phone'>;
  runtimeAdapter: string;
  policyPack: string;
  evaluationPack: string;
}

/**
 * The catalog is a shared product contract, not a dashboard-only list. New types enter here only
 * after their runtime, policy, trace and evaluation packs exist. Execution code keys off this
 * contract so adding a type never means adding an ungoverned special case.
 */
export const AGENT_CATALOG: readonly AgentCatalogDefinition[] = [
  {
    id: AgentCatalogType.WEB,
    version: 1,
    name: 'Web Agent',
    description: 'Customer chat and voice for websites and applications.',
    releaseState: 'released',
    supportedChannels: ['web', 'voice'],
    runtimeAdapter: 'voomate-web-agent-v1',
    policyPack: 'web-agent-policy-v1',
    evaluationPack: 'web-agent-evals-v1',
  },
  {
    id: AgentCatalogType.CRM,
    version: 1,
    name: 'CRM Tool Agent',
    description: 'Governed customer-record and follow-up workflows.',
    releaseState: 'design',
    supportedChannels: [],
    runtimeAdapter: 'unreleased',
    policyPack: 'unreleased',
    evaluationPack: 'unreleased',
  },
  {
    id: AgentCatalogType.SEO,
    version: 1,
    name: 'SEO Agent',
    description: 'Governed search visibility and content workflows.',
    releaseState: 'planned',
    supportedChannels: [],
    runtimeAdapter: 'unreleased',
    policyPack: 'unreleased',
    evaluationPack: 'unreleased',
  },
  {
    id: AgentCatalogType.CALLING,
    version: 1,
    name: 'Calling Agent',
    description: 'Inbound and outbound phone workflows using the shared operating context.',
    releaseState: 'planned',
    supportedChannels: [],
    runtimeAdapter: 'unreleased',
    policyPack: 'unreleased',
    evaluationPack: 'unreleased',
  },
] as const;

export function getAgentCatalogDefinition(type: AgentCatalogType): AgentCatalogDefinition {
  const definition = AGENT_CATALOG.find(({ id }) => id === type);
  if (!definition) throw new Error(`Unknown agent catalog type: ${type}`);
  return definition;
}

export function isReleasedAgentType(type: AgentCatalogType): boolean {
  return getAgentCatalogDefinition(type).releaseState === 'released';
}
