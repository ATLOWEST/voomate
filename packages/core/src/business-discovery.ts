import type { BusinessOperatingProfile, BusinessProfileEvidence } from './business-profile.js';

/**
 * A bounded, deterministic discovery pass over content a workspace has explicitly supplied.
 *
 * This is deliberately not an industry classifier. It identifies observed customer-facing
 * interaction patterns so the owner can review a proposed Business Operating Profile without
 * Voomate claiming that it understands an entire business from a homepage.
 */
export interface BusinessDiscoverySource {
  readonly reference: string;
  readonly text: string;
  readonly title?: string | null;
  readonly url?: string | null;
}

export interface DiscoveredIntent {
  readonly id: string;
  readonly name: string;
  readonly priority: number;
  readonly confidence: number;
  readonly evidenceCount: number;
}

export interface BusinessDiscovery {
  readonly version: 'business-discovery-v1';
  readonly profile: BusinessOperatingProfile;
  readonly evidence: BusinessProfileEvidence[];
  readonly interactionModes: readonly string[];
  readonly intents: readonly DiscoveredIntent[];
  readonly confidence: number;
  readonly unknowns: readonly string[];
  readonly changeSummary: string;
}

type Rule = {
  readonly id: string;
  readonly name: string;
  readonly priority: number;
  readonly mode: 'catalog' | 'scheduling' | 'account' | 'knowledge';
  readonly entity?: 'product' | 'service' | 'appointment' | 'order';
  readonly patterns: readonly RegExp[];
};

const RULES: readonly Rule[] = [
  {
    id: 'browse_catalog',
    name: 'Browse products or catalog',
    priority: 80,
    mode: 'catalog',
    entity: 'product',
    patterns: [/\b(product|catalog|collection|sku|add to cart|checkout)\b/i],
  },
  {
    id: 'product_availability',
    name: 'Product availability',
    priority: 75,
    mode: 'catalog',
    entity: 'product',
    patterns: [/\b(in stock|out of stock|inventory|availability|variant|size|colour|color)\b/i],
  },
  {
    id: 'order_status',
    name: 'Order or delivery status',
    priority: 95,
    mode: 'account',
    entity: 'order',
    patterns: [/\b(order|tracking|shipment|delivery|dispatch)\b/i],
  },
  {
    id: 'returns_policy',
    name: 'Returns or exchanges',
    priority: 78,
    mode: 'account',
    entity: 'order',
    patterns: [/\b(return|refund|exchange|replacement|cancel(?:lation)?)\b/i],
  },
  {
    id: 'appointment_booking',
    name: 'Book or change an appointment',
    priority: 90,
    mode: 'scheduling',
    entity: 'appointment',
    // Generic "availability" belongs to product inventory unless it appears with a scheduling
    // term. Treating it as an appointment signal makes ordinary stores look like clinics.
    patterns: [/\b(appointment|book(?:ing)?|calendar|time slot|reschedule)\b/i],
  },
  {
    id: 'service_details',
    name: 'Service details',
    priority: 65,
    mode: 'scheduling',
    entity: 'service',
    patterns: [/\b(service|consultation|session|duration|package)\b/i],
  },
  {
    id: 'account_help',
    name: 'Account or subscription help',
    priority: 70,
    mode: 'account',
    patterns: [/\b(account|sign in|login|password|subscription|billing)\b/i],
  },
];

const sourceText = (source: BusinessDiscoverySource): string =>
  `${source.title ?? ''}\n${source.text}`.slice(0, 100_000);

const confidenceFor = (evidenceCount: number, sourceCount: number): number => {
  if (sourceCount === 0) return 0;
  // More independent documents increase confidence, but discovery never reaches certainty.
  return Math.min(
    0.9,
    Number((0.45 + (0.45 * evidenceCount) / Math.min(sourceCount, 4)).toFixed(2)),
  );
};

export const discoverBusiness = (
  sources: readonly BusinessDiscoverySource[],
  observedAt = new Date().toISOString(),
): BusinessDiscovery => {
  const matches = RULES.flatMap((rule) => {
    const references = sources
      .filter((source) => rule.patterns.some((pattern) => pattern.test(sourceText(source))))
      .map((source) => source.reference)
      .slice(0, 12);
    if (!references.length) return [];
    return [{ rule, references }];
  });

  const interactionModes = [...new Set(matches.map(({ rule }) => rule.mode))];
  const entityShapes = [
    ...new Set(matches.flatMap(({ rule }) => (rule.entity ? [rule.entity] : []))),
  ];
  const intents: DiscoveredIntent[] = matches
    .map(({ rule, references }) => ({
      id: rule.id,
      name: rule.name,
      priority: rule.priority,
      confidence: confidenceFor(references.length, sources.length),
      evidenceCount: references.length,
    }))
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));

  const fallback = intents.length === 0;
  const profile: BusinessOperatingProfile = {
    identity: { audiences: [] },
    communication: {
      tone: 'friendly',
      answerStyle: 'balanced',
      languages: [],
      preferredTerms: {},
      prohibitedClaims: [],
    },
    customerIntents: fallback
      ? [
          {
            id: 'general_information',
            name: 'General business information',
            priority: 50,
            requiredFields: [],
          },
        ]
      : intents.map(({ id, name, priority }) => ({ id, name, priority, requiredFields: [] })),
    entities: entityShapes.map((name) => ({ name, publicFields: [] })),
    systems: [],
    // Discovery cannot grant capabilities, workflows, or autonomy. Those require an explicit
    // owner-approved connection and a separately tested workflow contract.
    capabilities: [],
    workflows: [],
    policies: [],
    escalation: [],
    evaluation: {
      minimumGroundingScore: 0.75,
      maximumCorrectionRate: 0.1,
      maximumEscalationRate: 0.35,
    },
  };

  const evidence: BusinessProfileEvidence[] = [
    {
      section: 'customer_intents',
      sourceType: 'website',
      sourceReference:
        sources
          .map(({ reference }) => reference)
          .slice(0, 12)
          .join(', ') || 'no-source',
      confidence: fallback ? 0.2 : confidenceFor(matches.length, sources.length),
      inferenceVersion: 'business-discovery-v1',
      observedAt,
      data: {
        interactionModes: fallback ? ['knowledge'] : interactionModes,
        intents: fallback ? ['general_information'] : intents.map(({ id }) => id),
        sourceCount: sources.length,
      },
    },
    ...matches.map(({ rule, references }) => ({
      section: rule.entity ? ('entities' as const) : ('customer_intents' as const),
      sourceType: 'website' as const,
      sourceReference: references.join(', '),
      confidence: confidenceFor(references.length, sources.length),
      inferenceVersion: 'business-discovery-v1',
      observedAt,
      data: {
        intent: rule.id,
        mode: rule.mode,
        entity: rule.entity,
        evidenceCount: references.length,
      },
    })),
  ];

  const unknowns = [
    'No live-data capability, write action, or customer permission is inferred from website content.',
    ...(sources.length === 0 ? ['No readable business content was available for discovery.'] : []),
    ...(fallback
      ? [
          'No high-confidence customer workflow was detected; review the knowledge sources or add owner input.',
        ]
      : []),
  ];
  const confidence = fallback ? 0.2 : confidenceFor(matches.length, sources.length);
  const description = fallback
    ? 'Created a low-confidence general-information profile; owner review is required.'
    : `Detected ${intents.length} customer intents across ${sources.length} approved content source${sources.length === 1 ? '' : 's'}; owner review is required before activation.`;

  return {
    version: 'business-discovery-v1',
    profile,
    evidence,
    interactionModes: fallback ? ['knowledge'] : interactionModes,
    intents,
    confidence,
    unknowns,
    changeSummary: description,
  };
};
