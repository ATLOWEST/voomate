export const usageMeterKinds = [
  'voice_minutes',
  'text_messages',
  'pages_crawled',
  'llm_input_tokens',
  'llm_output_tokens',
  'image_input_tokens',
  'image_upload_bytes',
  'embedding_input_tokens',
  'tts_characters',
  'agent_runs',
  'model_invocations',
  'knowledge_queries',
  'live_read_calls',
  'tool_calls',
  'tool_failures',
  'response_guard_interventions',
] as const;

export type UsageMeterKind = (typeof usageMeterKinds)[number];
export type UsageBillingMode = 'provider-estimate' | 'included' | 'diagnostic';

export interface UsageMeterDefinition {
  kind: UsageMeterKind;
  label: string;
  description: string;
  unit: string;
  billingMode: UsageBillingMode;
  /** USD per one unit. Null means the meter is visible but is not priced by this rate card. */
  providerRateUsd: number | null;
}

export interface UsageMeterBreakdown extends UsageMeterDefinition {
  quantity: number;
  estimatedProviderCostUsd: number;
}

/**
 * Provider-cost reference for the current default AWS stack, not a customer invoice.
 * Tool calls remain included until a reviewed Voomate overage policy is published.
 */
export const usageRateCard = {
  version: 'aws-default-2026-08-16',
  currency: 'USD' as const,
  source: 'https://aws.amazon.com/bedrock/pricing/',
  meters: [
    {
      kind: 'agent_runs',
      label: 'Agent requests',
      description: 'Customer requests accepted by the Web Agent runtime.',
      unit: 'requests',
      billingMode: 'included',
      providerRateUsd: null,
    },
    {
      kind: 'text_messages',
      label: 'Web messages',
      description: 'Typed customer messages processed by the Web Agent.',
      unit: 'messages',
      billingMode: 'included',
      providerRateUsd: null,
    },
    {
      kind: 'model_invocations',
      label: 'Model calls',
      description: 'Reasoning calls made to the configured foundation model.',
      unit: 'calls',
      billingMode: 'diagnostic',
      providerRateUsd: null,
    },
    {
      kind: 'llm_input_tokens',
      label: 'Model input',
      description: 'Prompt, conversation, knowledge, and tool-result input tokens.',
      unit: 'tokens',
      billingMode: 'provider-estimate',
      providerRateUsd: 0.8 / 1_000_000,
    },
    {
      kind: 'llm_output_tokens',
      label: 'Model output',
      description: 'Customer-facing and orchestration output tokens.',
      unit: 'tokens',
      billingMode: 'provider-estimate',
      providerRateUsd: 3.2 / 1_000_000,
    },
    {
      kind: 'knowledge_queries',
      label: 'Knowledge checks',
      description: 'Tenant-scoped lexical or semantic retrieval operations.',
      unit: 'queries',
      billingMode: 'included',
      providerRateUsd: null,
    },
    {
      kind: 'embedding_input_tokens',
      label: 'Knowledge embeddings',
      description: 'Titan Text Embeddings V2 input used for semantic retrieval.',
      unit: 'tokens',
      billingMode: 'provider-estimate',
      providerRateUsd: 0.02 / 1_000_000,
    },
    {
      kind: 'live_read_calls',
      label: 'Live data reads',
      description: 'Permissioned, read-only calls to connected client systems.',
      unit: 'reads',
      billingMode: 'included',
      providerRateUsd: null,
    },
    {
      kind: 'tool_calls',
      label: 'Tool requests',
      description: 'Governed tools requested by the Web Agent.',
      unit: 'calls',
      billingMode: 'included',
      providerRateUsd: null,
    },
    {
      kind: 'tool_failures',
      label: 'Tool failures',
      description: 'Tool requests denied by policy, invalid input, or execution errors.',
      unit: 'failures',
      billingMode: 'diagnostic',
      providerRateUsd: null,
    },
    {
      kind: 'response_guard_interventions',
      label: 'Reply repairs',
      description: 'Customer-language guard corrections before a reply was shown.',
      unit: 'repairs',
      billingMode: 'diagnostic',
      providerRateUsd: null,
    },
    {
      kind: 'image_input_tokens',
      label: 'Vision input',
      description: 'Diagnostic token count for image-bearing requests; already in model input.',
      unit: 'tokens',
      billingMode: 'diagnostic',
      providerRateUsd: null,
    },
    {
      kind: 'image_upload_bytes',
      label: 'Image uploads',
      description: 'Temporary image bytes accepted from widget sessions.',
      unit: 'bytes',
      billingMode: 'diagnostic',
      providerRateUsd: null,
    },
    {
      kind: 'voice_minutes',
      label: 'Voice time',
      description: 'Connected voice-session wall-clock minutes.',
      unit: 'minutes',
      billingMode: 'diagnostic',
      providerRateUsd: null,
    },
    {
      kind: 'tts_characters',
      label: 'Speech output',
      description: 'Characters sent to the configured speech provider.',
      unit: 'characters',
      billingMode: 'diagnostic',
      providerRateUsd: null,
    },
    {
      kind: 'pages_crawled',
      label: 'Pages learned',
      description: 'Approved website pages processed into business knowledge.',
      unit: 'pages',
      billingMode: 'included',
      providerRateUsd: null,
    },
  ] satisfies readonly UsageMeterDefinition[],
};

export function buildUsageBreakdown(
  totals: Partial<Record<UsageMeterKind, number>>,
): UsageMeterBreakdown[] {
  return usageRateCard.meters.map((meter) => {
    const quantity = Math.max(0, Number(totals[meter.kind] ?? 0));
    return {
      ...meter,
      quantity,
      estimatedProviderCostUsd:
        meter.providerRateUsd === null ? 0 : quantity * meter.providerRateUsd,
    };
  });
}

export function estimatedProviderCostUsd(totals: Partial<Record<UsageMeterKind, number>>): number {
  return buildUsageBreakdown(totals).reduce(
    (total, meter) => total + meter.estimatedProviderCostUsd,
    0,
  );
}
