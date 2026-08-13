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
