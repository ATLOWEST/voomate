import { z } from 'zod';

export type BusinessInteractionMode = 'catalog' | 'scheduling' | 'account' | 'knowledge';
export type BusinessEntityShape = 'product' | 'service' | 'appointment' | 'order';

export interface InferredBusinessProfile {
  version: 1;
  interactionModes: BusinessInteractionMode[];
  entityShapes: BusinessEntityShape[];
  responseTraits: Array<'visual-results' | 'time-aware' | 'status-first' | 'explanatory'>;
}

const signals: Array<{
  pattern: RegExp;
  mode: BusinessInteractionMode;
  entity?: BusinessEntityShape;
  trait: InferredBusinessProfile['responseTraits'][number];
}> = [
  {
    pattern: /\b(product|catalog|price|sku|inventory|stock|cart|checkout)\b/i,
    mode: 'catalog',
    entity: 'product',
    trait: 'visual-results',
  },
  {
    pattern: /\b(appointment|availability|calendar|slot|schedule|book(?:ing)?)\b/i,
    mode: 'scheduling',
    entity: 'appointment',
    trait: 'time-aware',
  },
  {
    pattern: /\b(service|consultation|session|duration)\b/i,
    mode: 'scheduling',
    entity: 'service',
    trait: 'time-aware',
  },
  {
    pattern: /\b(order|delivery|tracking|shipment|account|subscription)\b/i,
    mode: 'account',
    entity: 'order',
    trait: 'status-first',
  },
  {
    pattern: /\b(policy|about|guide|documentation|faq|how to|why)\b/i,
    mode: 'knowledge',
    trait: 'explanatory',
  },
];

export function inferBusinessProfile(
  ...sources: Array<string | null | undefined>
): InferredBusinessProfile {
  const content = sources.filter(Boolean).join('\n').slice(0, 100_000);
  const interactionModes = new Set<BusinessInteractionMode>();
  const entityShapes = new Set<BusinessEntityShape>();
  const responseTraits = new Set<InferredBusinessProfile['responseTraits'][number]>();
  for (const signal of signals) {
    if (!signal.pattern.test(content)) continue;
    interactionModes.add(signal.mode);
    if (signal.entity) entityShapes.add(signal.entity);
    responseTraits.add(signal.trait);
  }
  if (!interactionModes.size) interactionModes.add('knowledge');
  if (!responseTraits.size) responseTraits.add('explanatory');
  return {
    version: 1,
    interactionModes: [...interactionModes],
    entityShapes: [...entityShapes],
    responseTraits: [...responseTraits],
  };
}

export function businessProfileGuidance(profile: InferredBusinessProfile): string {
  const parts = [`Observed interaction modes: ${profile.interactionModes.join(', ')}.`];
  if (profile.entityShapes.length)
    parts.push(`Expected public result shapes: ${profile.entityShapes.join(', ')}.`);
  if (profile.responseTraits.includes('visual-results'))
    parts.push('Keep catalog answers short because structured results render visually.');
  if (profile.responseTraits.includes('time-aware'))
    parts.push('State dates, times, timezone, and availability precisely when returned.');
  if (profile.responseTraits.includes('status-first'))
    parts.push('Lead with the current verified status before supporting detail.');
  return parts.join(' ');
}

export const businessOperatingProfileSchema = z
  .object({
    identity: z
      .object({
        purpose: z.string().trim().max(500).optional(),
        positioning: z.string().trim().max(500).optional(),
        audiences: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
      })
      .default({ audiences: [] }),
    communication: z
      .object({
        tone: z.enum(['professional', 'friendly', 'concise', 'warm']).default('friendly'),
        answerStyle: z.enum(['concise', 'balanced', 'detailed']).default('balanced'),
        languages: z.array(z.string().trim().min(2).max(20)).max(20).default([]),
        preferredTerms: z.record(z.string().max(80), z.string().max(120)).default({}),
        prohibitedClaims: z.array(z.string().trim().min(1).max(300)).max(100).default([]),
      })
      .default({
        tone: 'friendly',
        answerStyle: 'balanced',
        languages: [],
        preferredTerms: {},
        prohibitedClaims: [],
      }),
    customerIntents: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z][a-z0-9_]{1,79}$/),
          name: z.string().trim().min(1).max(120),
          priority: z.number().int().min(0).max(100).default(50),
          requiredFields: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
          sourceOfTruth: z.string().trim().max(120).optional(),
        }),
      )
      .max(200)
      .default([]),
    entities: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(80),
          publicFields: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
        }),
      )
      .max(100)
      .default([]),
    systems: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(120),
          role: z.string().trim().min(1).max(240),
          sourceOfTruth: z.boolean().default(false),
        }),
      )
      .max(100)
      .default([]),
    capabilities: z
      .array(
        z.object({
          name: z.string().regex(/^[a-z][a-z0-9_]{1,99}$/),
          kind: z.enum(['read', 'write', 'handoff']),
          risk: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
          autonomy: z.number().int().min(0).max(4).default(0),
        }),
      )
      .max(200)
      .default([]),
    workflows: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z][a-z0-9_]{1,99}$/),
          name: z.string().trim().min(1).max(120),
          purpose: z.string().trim().min(1).max(500),
          version: z.number().int().positive(),
        }),
      )
      .max(100)
      .default([]),
    policies: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z][a-z0-9_]{1,99}$/),
          rule: z.string().trim().min(1).max(1_000),
          priority: z.number().int().min(0).max(100).default(50),
        }),
      )
      .max(200)
      .default([]),
    escalation: z
      .array(
        z.object({
          trigger: z.string().trim().min(1).max(500),
          destination: z.string().trim().min(1).max(200),
        }),
      )
      .max(100)
      .default([]),
    evaluation: z
      .object({
        minimumGroundingScore: z.number().min(0).max(1).default(0.75),
        maximumCorrectionRate: z.number().min(0).max(1).default(0.1),
        maximumEscalationRate: z.number().min(0).max(1).default(0.35),
      })
      .default({
        minimumGroundingScore: 0.75,
        maximumCorrectionRate: 0.1,
        maximumEscalationRate: 0.35,
      }),
  })
  .strict();

export type BusinessOperatingProfile = z.infer<typeof businessOperatingProfileSchema>;

export const businessProfileEvidenceSchema = z
  .object({
    section: z.enum([
      'identity',
      'communication',
      'customer_intents',
      'entities',
      'systems',
      'capabilities',
      'workflows',
      'policies',
      'escalation',
      'evaluation',
    ]),
    sourceType: z.enum([
      'website',
      'ui_manifest',
      'capability_manifest',
      'connected_system',
      'conversation_sample',
      'owner_input',
      'evaluation',
    ]),
    sourceReference: z.string().trim().min(1).max(500),
    confidence: z.number().min(0).max(1),
    inferenceVersion: z.string().trim().min(1).max(120),
    observedAt: z.string().datetime(),
    data: z.record(z.string().max(80), z.unknown()).default({}),
  })
  .strict();

export type BusinessProfileEvidence = z.infer<typeof businessProfileEvidenceSchema>;

export const proposeBusinessProfileSchema = z
  .object({
    profile: businessOperatingProfileSchema,
    evidence: z.array(businessProfileEvidenceSchema).min(1).max(500),
    changeSummary: z.string().trim().min(1).max(1_000),
  })
  .strict();

export function operatingProfileGuidance(profile: BusinessOperatingProfile): string {
  const guidance: string[] = [
    `Approved communication style: ${profile.communication.tone}, ${profile.communication.answerStyle}.`,
  ];
  if (profile.identity.purpose) guidance.push(`Business purpose: ${profile.identity.purpose}`);
  if (profile.communication.prohibitedClaims.length) {
    guidance.push(
      `Never make these claims: ${profile.communication.prohibitedClaims.slice(0, 12).join('; ')}.`,
    );
  }
  if (profile.customerIntents.length) {
    guidance.push(
      `Prioritized customer intents: ${profile.customerIntents
        .slice()
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 20)
        .map(({ id }) => id)
        .join(', ')}.`,
    );
  }
  if (profile.escalation.length) {
    guidance.push(
      `Escalation rules: ${profile.escalation
        .slice(0, 12)
        .map(({ trigger, destination }) => `${trigger} -> ${destination}`)
        .join('; ')}.`,
    );
  }
  return guidance.join(' ');
}
