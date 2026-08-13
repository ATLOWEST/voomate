import type { LiveReadCapability } from './live-data';
import type { NavigateClientCommand, WebAgentPageContext } from './page-context';
import { resolveDestination, type DestinationResolution } from './destination-resolver';

const MAX_LIVE_CAPABILITIES_PER_TURN = 8;
const tokenPattern = /[a-z0-9]{3,}/g;
const genericWords = new Set([
  'current',
  'customer',
  'data',
  'details',
  'from',
  'get',
  'information',
  'live',
  'one',
  'public',
  'read',
  'record',
  'the',
  'verified',
]);
const staticKnowledgeIntent =
  /\b(about|business|company|explain|feature|how|policy|product|return|setup|set up|what is|why)\b/i;
const liveOrActionIntent =
  /\b(available|availability|book|cancel|cart|checkout|delivery|inventory|order|payment|refund|reserve|slot|stock|track)\b/i;
const pageAssistanceIntent =
  /\b(this|that|current|dashboard|page|screen|here|where am i|how (?:do|can|to)|what is this)\b/i;
const explicitWebNavigation = [
  /\b(?:go|send)(?: me)?(?: back)?\s+to\b/i,
  /\b(?:take|bring) me(?: back)?\s+to\b/i,
  /\b(?:navigate|head|switch)(?: me)?\s+to\b/i,
  /\bvisit(?: the)?\b/i,
  /\bopen(?: the)?\b/i,
];
const informationRequest =
  /\b(what(?:'s| is| are)|how much|cost|price|pricing (?:details|plans|options)|tell me|explain|compare|comparison|difference|which plan|show me|learn about|details about|where (?:is|can))\b/i;
const installAppIntent = /\b(?:install|download)(?: the)? (?:mobile )?app\b/i;
const openAppIntent =
  /\bopen\b[\s\S]{0,80}\b(?:in|inside) the (?:mobile )?app\b|\bopen the (?:mobile )?app\b/i;
const casualConversation =
  /^\s*(?:(?:hi|hello|hey)(?:[,!\s]+(?:how are you|can you hear me))?|good (?:morning|afternoon|evening)|thanks?|thank you|bye|goodbye)[!.?\s]*$/i;

export type OrchestrationSource =
  'conversation' | 'page_context' | 'knowledge' | 'live_read' | 'controlled_action';

export interface WebAgentOrchestrationPlan {
  route:
    'web' | 'web_knowledge' | 'web_page_assistance' | 'web_integration_read' | 'web_multi_source';
  capabilities: LiveReadCapability[];
  availableCapabilityCount: number;
  selection: 'none_available' | 'not_relevant' | 'relevance_ranked';
  useKnowledge: boolean;
  usePageContext: boolean;
  controlledActions: Array<'check_order_status'>;
  clientCommands: NavigateClientCommand[];
  destinationDecision: {
    request: 'none' | 'navigation' | 'information';
    outcome: DestinationResolution['kind'];
    label?: string;
    match?: string;
    score?: number;
    candidates?: string[];
    closestLabel?: string;
    topScore?: number;
    availableDestinations: number;
    reason?: string;
  };
  sources: Array<{ source: OrchestrationSource; reason: string }>;
  responseGuidance?: string;
  directReply?: string;
}

function tokens(value: string): Set<string> {
  const result = new Set(
    (value.toLowerCase().match(tokenPattern) ?? []).filter((token) => !genericWords.has(token)),
  );
  if (result.has('stock')) {
    result.add('inventory');
    result.add('available');
    result.add('availability');
  }
  if (result.has('available') || result.has('availability')) result.add('inventory');
  if (result.has('track') || result.has('delivery')) result.add('order');
  return result;
}

function relevance(messageTokens: Set<string>, capability: LiveReadCapability): number {
  const nameTokens = tokens(capability.name.replaceAll('_', ' '));
  const descriptionTokens = tokens(capability.description);
  const parameterTokens = tokens(Object.keys(capability.parameters).join(' '));
  let score = 0;
  for (const token of messageTokens) {
    if (nameTokens.has(token)) score += 5;
    if (descriptionTokens.has(token)) score += 2;
    if (parameterTokens.has(token)) score += 1;
  }
  return score;
}

function requestedNavigationIntent(message: string): NavigateClientCommand['intent'] | undefined {
  if (installAppIntent.test(message)) return 'install_app';
  if (openAppIntent.test(message)) return 'open_app';
  return explicitWebNavigation.some((pattern) => pattern.test(message)) ? 'web' : undefined;
}

function navigationCommand(
  intent: NavigateClientCommand['intent'] | undefined,
  resolution: DestinationResolution,
): NavigateClientCommand | undefined {
  if (!intent || resolution.kind !== 'resolved') return undefined;
  const target = resolution.destination;
  if (intent === 'open_app' && !target.native?.ios && !target.native?.android) return undefined;
  if (
    intent === 'install_app' &&
    !target.native?.ios?.storeUrl &&
    !target.native?.android?.storeUrl
  ) {
    return undefined;
  }
  return {
    type: 'navigate',
    url: target.url,
    label: target.label,
    intent,
    ...(target.native ? { native: target.native } : {}),
  };
}

function routeFor(input: {
  live: boolean;
  knowledge: boolean;
  page: boolean;
  command: boolean;
}): WebAgentOrchestrationPlan['route'] {
  const sourceCount = [input.live, input.knowledge, input.page].filter(Boolean).length;
  if (sourceCount > 1 || (input.command && sourceCount > 0)) return 'web_multi_source';
  if (input.live) return 'web_integration_read';
  if (input.page || input.command) return 'web_page_assistance';
  if (input.knowledge) return 'web_knowledge';
  return 'web';
}

/**
 * Deterministic coordination above RAG, live reads, controlled actions, and page assistance.
 * Offline RLAIF can score this plan, but it cannot promote tools or mutate the policy at runtime.
 */
export function planWebAgentTurn(input: {
  message: string;
  availableCapabilities: readonly LiveReadCapability[];
  pageContext?: WebAgentPageContext;
  platformMode?: boolean;
}): WebAgentOrchestrationPlan {
  const messageTokens = tokens(input.message);
  const capabilities = input.availableCapabilities
    .map((capability) => ({ capability, score: relevance(messageTokens, capability) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.capability.name.localeCompare(right.capability.name),
    )
    .slice(0, MAX_LIVE_CAPABILITIES_PER_TURN)
    .map(({ capability }) => capability);
  const requestedIntent = requestedNavigationIntent(input.message);
  const asksForInformation = informationRequest.test(input.message);
  const navigationResolution: DestinationResolution =
    requestedIntent && !asksForInformation
      ? resolveDestination(input.message, input.pageContext, 'navigation')
      : ({ kind: 'none' } as const);
  // A request for facts wins over navigation even when it contains a movement verb.
  const command = navigationCommand(requestedIntent, navigationResolution);
  const informationResolution: DestinationResolution = asksForInformation
    ? resolveDestination(input.message, input.pageContext, 'information')
    : ({ kind: 'none' } as const);
  const informationTarget =
    informationResolution.kind === 'resolved' ? informationResolution.destination : undefined;
  const useKnowledge =
    !casualConversation.test(input.message) &&
    (staticKnowledgeIntent.test(input.message) || !liveOrActionIntent.test(input.message));
  const usePageContext = Boolean(
    input.pageContext &&
    (pageAssistanceIntent.test(input.message) ||
      requestedIntent ||
      informationTarget ||
      /\b(about|business|company|product)\b/i.test(input.message)),
  );
  const controlledActions: Array<'check_order_status'> = /\b(order|track|delivery)\b/i.test(
    input.message,
  )
    ? ['check_order_status']
    : [];
  const sources: WebAgentOrchestrationPlan['sources'] = [
    { source: 'conversation', reason: 'visitor request and tenant-scoped conversation history' },
  ];
  if (usePageContext)
    sources.push({ source: 'page_context', reason: 'request depends on the current client UI' });
  if (useKnowledge)
    sources.push({
      source: 'knowledge',
      reason: 'request needs stable business or product knowledge',
    });
  if (capabilities.length)
    sources.push({ source: 'live_read', reason: 'request needs current client-system state' });
  if (controlledActions.length)
    sources.push({
      source: 'controlled_action',
      reason: 'request may need a separately scoped harness action',
    });

  let responseGuidance: string | undefined;
  let directReply: string | undefined;
  if (command) {
    const action =
      command.intent === 'install_app'
        ? 'open the official app store for'
        : command.intent === 'open_app'
          ? 'open the native app at'
          : 'open';
    responseGuidance = `A verified ${command.intent} navigation command will ${action} ${command.label} after this reply. Say what is opening; do not return a link or claim any configuration or write has completed.`;
    directReply =
      command.intent === 'install_app'
        ? `Opening the official app store for ${command.label}.`
        : command.intent === 'open_app'
          ? `Opening ${command.label} in the app.`
          : `Opening ${command.label}.`;
    if (
      input.platformMode &&
      /\b(create|new|add)\b/i.test(input.message) &&
      /\b(web|agent)\b/i.test(input.message)
    ) {
      responseGuidance +=
        ' Voomate already provides one fixed Web Agent slot, so guide the user to configure that slot instead of promising a duplicate agent.';
      directReply = `Opening ${command.label}. Your account already includes one Web Agent as part of Voomate's three fixed agent slots, so configure that existing agent there instead of creating a duplicate.`;
    }
  } else if (requestedIntent && !asksForInformation && navigationResolution.kind === 'ambiguous') {
    const labels = [...new Set(navigationResolution.candidates.map(({ label }) => label))].slice(
      0,
      4,
    );
    responseGuidance =
      'The requested destination is ambiguous. Ask the visitor to choose one of the verified candidates; do not request or invent a URL.';
    directReply = `I found more than one matching place. Did you mean ${labels.join(' or ')}?`;
  } else if (requestedIntent && !asksForInformation && navigationResolution.kind === 'none') {
    const labels = [
      ...new Set((input.pageContext?.navigation ?? []).map(({ label }) => label)),
    ].slice(0, 8);
    responseGuidance =
      'The requested destination did not safely match the host manifest. Name available destinations without asking the visitor for a URL.';
    directReply = labels.length
      ? `I couldn't safely match that to a page here. I can open ${labels.join(', ')}.`
      : `I couldn't safely match that to a page available here.`;
  } else if (informationTarget?.facts?.length) {
    responseGuidance = `Answer the visitor's question in the widget from these verified, host-curated ${informationTarget.label} facts. Synthesize naturally and do not redirect or tell them to visit the page: ${informationTarget.facts.join(' | ')}`;
    directReply = [
      `${informationTarget.label}:`,
      ...informationTarget.facts.map((fact, index) => `${index + 1}. ${fact}`),
    ].join('\n');
  } else if (
    /\b(?:(?:what|which) (?:information|details)|what do you need|information you need)[\s\S]{0,80}\border\b/i.test(
      input.message,
    )
  ) {
    responseGuidance =
      'Ask the customer directly for the two verified order lookup fields. Do not call the tool until both are present.';
    directReply =
      'Please share the order ID and the email used at checkout, and I’ll check it for you.';
  } else if (
    input.platformMode &&
    /\b(set ?up|connect)\b/i.test(input.message) &&
    /\b(account|business|agent)\b/i.test(input.message)
  ) {
    responseGuidance =
      'Give a concrete onboarding path: configure the three fixed agent slots, add business knowledge, connect tools through Integration, test, then publish. Do not describe this as an unsupported request.';
    directReply = [
      'Yes. Here is the clean setup path:',
      '1. Open Agents and configure the existing Voice Calling, Web, and Integration agent slots.',
      '2. Add your public business knowledge, policies, products, and services.',
      '3. Use Integrations for read-only live data and add each write action with its own permission and approval rule.',
      '4. Test real customer requests, inspect Logs, then publish the Web Agent to your site.',
    ].join('\n');
  } else if (usePageContext && /\b(what|explain|how)\b/i.test(input.message)) {
    responseGuidance =
      'Explain the current page directly from its title, description, and visible headings, then give the next useful action. Do not say the page is unsupported.';
    if (input.platformMode && input.pageContext) {
      const surface = input.pageContext.surface;
      directReply = `${(surface?.title ?? input.pageContext.title) || 'This page'} is ${
        (surface?.description ?? input.pageContext.description) || 'your current Voomate workspace'
      } Start with Agents to configure the team, Integrations to connect business systems, and Logs to see what each response consulted and why.`;
    }
  }
  if (
    input.platformMode &&
    /\b(why|founder|real point|what is voomate|voomate about|explain (?:me )?voomate)\b/i.test(
      input.message,
    )
  ) {
    directReply = [
      'Voomate exists to make a capable AI operating team practical for small and medium businesses:',
      '1. The three fixed agents cover phone, web, and connected tools without enterprise staffing costs.',
      '2. They are built to complete permissioned work, not stop at chatbot answers.',
      '3. One universal agent system adapts through knowledge and tools instead of industry-specific agent types.',
      '4. Read-only access, scoped write actions, approvals, logs, and evaluations make trust the foundation.',
      '5. The goal is to move customer operations into an AI-native workflow while the business keeps control.',
    ].join('\n');
  }

  return {
    route: routeFor({
      live: capabilities.length > 0,
      knowledge: useKnowledge,
      page: usePageContext,
      command: Boolean(command),
    }),
    capabilities,
    availableCapabilityCount: input.availableCapabilities.length,
    selection:
      input.availableCapabilities.length === 0
        ? 'none_available'
        : capabilities.length > 0
          ? 'relevance_ranked'
          : 'not_relevant',
    useKnowledge,
    usePageContext,
    controlledActions,
    clientCommands: command ? [command] : [],
    destinationDecision:
      informationResolution.kind === 'resolved'
        ? {
            request: 'information',
            outcome: 'resolved',
            availableDestinations: input.pageContext?.navigation.length ?? 0,
            label: informationResolution.destination.label,
            match: informationResolution.match,
            score: informationResolution.score,
          }
        : informationResolution.kind === 'ambiguous'
          ? {
              request: 'information',
              outcome: 'ambiguous',
              availableDestinations: input.pageContext?.navigation.length ?? 0,
              candidates: informationResolution.candidates.map(({ label }) => label),
            }
          : requestedIntent && navigationResolution.kind === 'resolved'
            ? {
                request: 'navigation',
                outcome: 'resolved',
                availableDestinations: input.pageContext?.navigation.length ?? 0,
                label: navigationResolution.destination.label,
                match: navigationResolution.match,
                score: navigationResolution.score,
              }
            : requestedIntent && navigationResolution.kind === 'ambiguous'
              ? {
                  request: 'navigation',
                  outcome: 'ambiguous',
                  availableDestinations: input.pageContext?.navigation.length ?? 0,
                  candidates: navigationResolution.candidates.map(({ label }) => label),
                }
              : {
                  request: requestedIntent
                    ? 'navigation'
                    : asksForInformation
                      ? 'information'
                      : 'none',
                  outcome: 'none',
                  availableDestinations: input.pageContext?.navigation.length ?? 0,
                  ...((informationResolution.kind === 'none' && informationResolution.reason) ||
                  (navigationResolution.kind === 'none' && navigationResolution.reason)
                    ? {
                        reason:
                          informationResolution.kind === 'none' && informationResolution.reason
                            ? informationResolution.reason
                            : navigationResolution.kind === 'none'
                              ? navigationResolution.reason
                              : undefined,
                      }
                    : {}),
                  ...(navigationResolution.kind === 'none' && navigationResolution.closestLabel
                    ? {
                        closestLabel: navigationResolution.closestLabel,
                        topScore: navigationResolution.topScore,
                      }
                    : informationResolution.kind === 'none' && informationResolution.closestLabel
                      ? {
                          closestLabel: informationResolution.closestLabel,
                          topScore: informationResolution.topScore,
                        }
                      : {}),
                },
    sources,
    responseGuidance,
    directReply,
  };
}
