import type { LiveReadCapability } from './live-data';
import {
  portalScopeForUrl,
  type NavigateClientCommand,
  type WebAgentPageContext,
} from './page-context';
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
  /\b(?:go|send)(?: me)?(?: back)?\s+(?:to|into)\b/i,
  /\b(?:take|bring) me(?: back)?\s+(?:to|into)\b/i,
  /\b(?:navigate|head|switch|redirect|route)(?: me)?\s+(?:back\s+)?(?:to|into)\b/i,
  // Voice transcription and fast typing commonly misspell "navigate". This only recognizes
  // a navigation *intent*; destination resolution below still requires an advertised route.
  /\b(?:navigat\w*|navag\w*)\s+(?:me\s+)?(?:back\s+)?(?:to|into)\b/i,
  /\b(?:redirect\w*|rediect\w*|rediet\w*)\s+(?:this\s+)?(?:me\s+)?(?:to|into)\b/i,
  /\bvisit(?: the)?\b/i,
  /\bopen(?: the)?\b/i,
  /\b(?:redirect|take|lead|move|switch)\s+(?:me\s+)?(?:to\s+)?/i,
];
const informationRequest =
  /\b(what(?:'s| is| are)|how much|cost|price|pricing (?:details|plans|options)|tell me|explain|compare|comparison|difference|which plan|show me|learn about|details about|where (?:is|can))\b/i;
// "How Voomate works" is an information request, not a request to navigate. Keep this
// separate from broad "how" matching so operational questions still use their normal paths.
const howItWorksRequest = /\bhow\s+(?:(?:does|do)\s+)?(?:[a-z0-9][a-z0-9'’-]*\s+){0,4}works?\b/i;
const installAppIntent = /\b(?:install|download)(?: the)? (?:mobile )?app\b/i;
const openAppIntent =
  /\bopen\b[\s\S]{0,80}\b(?:in|inside) the (?:mobile )?app\b|\bopen the (?:mobile )?app\b/i;
const casualConversation =
  /^\s*(?:(?:hi|hello|hey)(?:[,!\s]+(?:how are you|can you hear me))?|good (?:morning|afternoon|evening)|thanks?|thank you|bye|goodbye)[!.?\s]*$/i;
const platformSetupIntent =
  /\b(?:set ?up|onboard|connect|configure|start|create)\b[\s\S]{0,100}\b(?:account|business|workspace|agent|voomate)\b|\bhow (?:do|can|to) (?:i|we) (?:get started|set ?up)\b/i;
const agentInventoryIntent =
  /\b(?:do (?:i|we) have|is there|are there|how many|check|show)\b[\s\S]{0,80}\bagents?\b|\bagents?\b[\s\S]{0,80}\b(?:active|configured|installed|added|running)\b/i;

/**
 * Repairs only the small set of product-name substitutions that are repeatedly produced by
 * speech recognition. This is deliberately opt-in for the Voomate control plane: a client
 * discussing a literal roommate must never have their words silently rewritten.
 */
export function repairPlatformTranscription(message: string, platformMode: boolean): string {
  if (!platformMode) return message;
  return message
    .replace(/\b(?:his|this|the)\s+roommate\b/gi, 'Voomate')
    .replace(/\bvy\s+(?=overview\b)/gi, 'why ');
}

export interface PlatformJourneyDecision {
  kind: 'workspace_setup' | 'agent_inventory';
  stage: 'public_site' | 'operating_panel' | 'unknown';
  accountState: 'unavailable' | 'empty' | 'configured';
  nextAction: 'sign_in' | 'add_agent' | 'configure_agent' | 'open_agents';
}

export type OrchestrationSource =
  | 'conversation'
  | 'page_context'
  | 'operating_state'
  | 'knowledge'
  | 'live_read'
  | 'controlled_action';

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
  platformJourney?: PlatformJourneyDecision;
  responseGuidance?: string;
  directReply?: string;
}

const dashboardSurfaceIds = new Set([
  'overview',
  'agents',
  'web-agent',
  'voice-agent',
  'integration-agent',
  'integrations',
  'conversations',
  'logs',
  'feedback',
  'approvals',
  'usage',
  'settings',
  'web-agent-playground',
  'web-agent-install',
]);

function platformJourneyFor(
  message: string,
  pageContext: WebAgentPageContext | undefined,
  platformMode: boolean | undefined,
): PlatformJourneyDecision | undefined {
  if (!platformMode) return undefined;
  const kind = agentInventoryIntent.test(message)
    ? 'agent_inventory'
    : platformSetupIntent.test(message)
      ? 'workspace_setup'
      : undefined;
  if (!kind) return undefined;

  const inventory = pageContext?.operatingState?.agentInventory;
  if (inventory) {
    return {
      kind,
      stage: 'operating_panel',
      accountState: inventory.total === 0 ? 'empty' : 'configured',
      nextAction: inventory.total === 0 ? 'add_agent' : 'configure_agent',
    };
  }

  const surfaceId = pageContext?.surface?.id;
  if (surfaceId && !dashboardSurfaceIds.has(surfaceId)) {
    return {
      kind,
      stage: 'public_site',
      accountState: 'unavailable',
      nextAction: 'sign_in',
    };
  }

  return {
    kind,
    stage: surfaceId ? 'operating_panel' : 'unknown',
    accountState: 'unavailable',
    nextAction: 'open_agents',
  };
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

function mentionsCurrentSurface(
  message: string,
  pageContext: WebAgentPageContext | undefined,
): boolean {
  if (!pageContext) return false;
  const messageTokens = tokens(message);
  const surfaceTokens = [
    pageContext.title,
    pageContext.surface?.title,
    ...(pageContext.surface?.aliases ?? []),
  ].flatMap((value) => [...tokens(value ?? '')]);
  return surfaceTokens.some((token) => messageTokens.has(token));
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
  const platformJourney = platformJourneyFor(input.message, input.pageContext, input.platformMode);
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
  const asksForInformation =
    informationRequest.test(input.message) || howItWorksRequest.test(input.message);
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
      mentionsCurrentSurface(input.message, input.pageContext) ||
      requestedIntent ||
      informationTarget ||
      platformJourney ||
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
  if (platformJourney && input.pageContext?.operatingState)
    sources.push({
      source: 'operating_state',
      reason: 'request depends on safe workspace agent counts supplied by the signed-in host UI',
    });
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
        ' Guide the user to choose an available agent type from the catalog, activate only what the workspace needs, or configure an existing instance. Do not claim that provisioning completed without a successful write action.';
      const inventory = input.pageContext?.operatingState?.agentInventory;
      directReply = inventory
        ? inventory.total === 0
          ? `Opening ${command.label}. This workspace has no agents yet, so choose Add agent, then Web Agent.`
          : `Opening ${command.label}. This workspace has ${inventory.total} agent${inventory.total === 1 ? '' : 's'}; open one to configure it, or choose Add agent for another Web Agent.`
        : `Opening ${command.label}. Choose Web Agent from the catalog to add one, or open an existing Web Agent to configure it.`;
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
    const currentPortal =
      input.pageContext?.portalScope ?? portalScopeForUrl(input.pageContext?.url ?? '');
    const allNav = input.pageContext?.navigation ?? [];
    const targetList = allNav.filter(
      (item) => (item.portalScope ?? portalScopeForUrl(item.url)) === currentPortal,
    );
    const labels = [...new Set(targetList.map(({ label }) => label))].slice(0, 8);
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
  } else if (informationTarget?.description) {
    responseGuidance = `Answer the visitor's question from the verified, host-curated ${informationTarget.label} description. Do not redirect or invent additional product claims: ${informationTarget.description}`;
    directReply = `${informationTarget.label} — ${informationTarget.description}`;
  } else if (
    /\b(?:(?:what|which) (?:information|details)|what do you need|information you need)[\s\S]{0,80}\border\b/i.test(
      input.message,
    )
  ) {
    responseGuidance =
      'Ask the customer directly for the two verified order lookup fields. Do not call the tool until both are present.';
    directReply =
      'Please share the order ID and the email used at checkout, and I’ll check it for you.';
  } else if (platformJourney?.kind === 'agent_inventory') {
    const inventory = input.pageContext?.operatingState?.agentInventory;
    responseGuidance =
      'Report only the trusted count-only workspace state supplied by the signed-in host UI. Never infer private workspace state from public pages, retrieved knowledge, or conversation text.';
    directReply = inventory
      ? inventory.total === 0
        ? 'This workspace has no agents yet. Open Agents, choose Add agent, then select Web Agent to begin.'
        : `This workspace has ${inventory.total} agent${inventory.total === 1 ? '' : 's'}: ${inventory.active} active, ${inventory.draft} draft, and ${inventory.paused} paused. Open Agents to configure them or add another available agent.`
      : platformJourney.stage === 'public_site'
        ? 'I can’t inspect a private workspace from the public site. Sign in, then open Agents; there I can check the workspace’s live agent count and guide the exact next step.'
        : 'I can’t verify the workspace’s agent count from this screen yet. Open Agents and I’ll use the signed-in workspace state there instead of guessing.';
  } else if (platformJourney?.kind === 'workspace_setup') {
    const inventory = input.pageContext?.operatingState?.agentInventory;
    responseGuidance =
      'Give the next setup steps for the verified journey stage. Never imply that an account or agent exists unless trusted signed-in operating state confirms it.';
    directReply = inventory
      ? inventory.total === 0
        ? [
            'You’re signed in, and this workspace has no agents yet. Start here:',
            '1. Open Agents and choose Add agent.',
            '2. Select Web Agent, then add your business knowledge and customer-facing rules.',
            '3. Connect only the tools it needs; live data stays read-only, while every write action has its own permission and approval policy.',
            '4. Test it in the playground, review Logs, then publish the widget.',
          ].join('\n')
        : [
            `You’re signed in and this workspace already has ${inventory.total} agent${inventory.total === 1 ? '' : 's'}. Continue here:`,
            '1. Open Agents and configure the existing Web Agent, or choose Add agent if Web Agent is missing.',
            '2. Add business knowledge and connect only the required tools.',
            '3. Test real customer tasks, inspect Logs and approvals, then publish.',
          ].join('\n')
      : platformJourney.stage === 'public_site'
        ? [
            'Start with your Voomate account:',
            '1. Create an account or sign in, then open the dashboard.',
            '2. Open Agents. The signed-in assistant will check whether your workspace already has an agent.',
            '3. If it is empty, choose Add agent, then Web Agent.',
            '4. Add knowledge, connect only required tools, test in the playground, review Logs, and publish.',
          ].join('\n')
        : [
            'Open Agents so I can verify the signed-in workspace state instead of guessing.',
            '1. If no agent exists, choose Add agent, then Web Agent.',
            '2. If one already exists, open it and continue with knowledge, connections, testing, and publishing.',
          ].join('\n');
  } else if (
    usePageContext &&
    (/\b(?:what|explain|how|why|vy|where|can(?:not|'t)\s+see)\b/i.test(input.message) ||
      mentionsCurrentSurface(input.message, input.pageContext))
  ) {
    responseGuidance =
      'Explain the current page directly from its title, description, and visible headings, then give the next useful action. Do not say the page is unsupported.';
    if (input.pageContext) {
      const surface = input.pageContext.surface;
      const portalScope = input.pageContext.portalScope ?? portalScopeForUrl(input.pageContext.url);
      const labels = input.pageContext.navigation
        .filter((item) => (item.portalScope ?? portalScopeForUrl(item.url)) === portalScope)
        .map(({ label }) => label)
        .slice(0, 4);
      directReply = `${(surface?.title ?? input.pageContext.title) || 'This page'} — ${
        (surface?.description ?? input.pageContext.description) || 'your current Voomate workspace'
      }${labels.length ? ` Available here: ${labels.join(', ')}.` : ''}`;
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
      '1. Its launch catalog covers phone, web, and connected tools without forcing every business to run every agent.',
      '2. They are built to complete permissioned work, not stop at chatbot answers.',
      '3. One governed agent, workflow, and tool system adapts through evidence instead of industry presets, and can add more agent types over time.',
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
    platformJourney,
    responseGuidance,
    directReply,
  };
}
