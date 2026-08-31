import { describe, expect, it } from 'vitest';
import type { LiveReadCapability } from './live-data';
import type { WebAgentPageContext } from './page-context';
import { planWebAgentTurn, repairPlatformTranscription } from './orchestration';

function capability(name: string, description: string): LiveReadCapability {
  return {
    connectionId: `connection-${name}`,
    name,
    description,
    sensitivity: 'public',
    parameters: {},
    publicFields: ['status'],
  };
}

const pageContext: WebAgentPageContext = {
  url: 'https://app.voomate.test/',
  title: 'Overview',
  description: 'A live operating overview of Voomate.',
  headings: ['Your AI team'],
  surface: {
    id: 'overview',
    title: 'Overview',
    description: 'A live operating overview of Voomate.',
  },
  navigation: [
    {
      label: 'Agents',
      url: 'https://app.voomate.test/agents',
      description: 'Choose, connect, and operate the agents this workspace needs.',
      aliases: ['agent board', 'AI team'],
    },
    { label: 'Logs', url: 'https://app.voomate.test/logs' },
    {
      label: 'Pricing',
      url: 'https://app.voomate.test/pricing',
      description: 'Compare plans and included usage.',
      aliases: ['billing plans', 'cost', 'price'],
      facts: ['Starter is free.', 'Growth costs ₹2,499 per month.'],
      native: {
        ios: {
          url: 'https://native.voomate.test/pricing',
          storeUrl: 'https://apps.apple.com/app/id123456789',
        },
        android: {
          url: 'https://native.voomate.test/pricing',
          storeUrl: 'https://play.google.com/store/apps/details?id=com.voomate.app',
        },
      },
    },
    {
      label: 'Product',
      url: 'https://app.voomate.test/product',
      description: 'How Voomate coordinates agents, governed tools, and approved workflows.',
      aliases: ['features', 'how it works', 'how voomate works'],
      facts: [
        'Voomate connects Web Agent, Voice Calling Agent, and Integration Agent through one shared business context.',
        'Read-only data, separately permissioned actions, approvals, and logs keep the business in control.',
      ],
    },
  ],
};

const landingPageContext: WebAgentPageContext = {
  ...pageContext,
  url: 'https://app.voomate.test/',
  title: 'Voomate',
  surface: {
    id: 'home',
    title: 'Voomate',
    description: 'The public Voomate product site.',
  },
};

function dashboardContext(total: number, active = 0, draft = 0): WebAgentPageContext {
  return {
    ...pageContext,
    operatingState: {
      source: 'host_ui',
      agentInventory: { total, active, draft, paused: total - active - draft },
    },
  };
}

describe('web agent orchestration', () => {
  it('repairs known speech substitutions only for the Voomate control plane', () => {
    expect(repairPlatformTranscription('What is his roommate and how do I set it up?', true)).toBe(
      'What is Voomate and how do I set it up?',
    );
    expect(repairPlatformTranscription('What is his roommate?', false)).toBe(
      'What is his roommate?',
    );
  });

  it('exposes only capabilities relevant to the current turn', () => {
    const result = planWebAgentTurn({
      message: 'Where is order A-100?',
      availableCapabilities: [
        capability('get_inventory', 'Read sellable inventory for a product SKU.'),
        capability('get_order', 'Read the current status of an order.'),
      ],
    });
    expect(result.capabilities.map(({ name }) => name)).toEqual(['get_order']);
    expect(result.controlledActions).toEqual(['check_order_status']);
  });

  it('plans live inventory and static policy knowledge for one compound question', () => {
    const result = planWebAgentTurn({
      message: 'Is the blue jacket in stock, and what is your return policy?',
      availableCapabilities: [
        capability('get_inventory', 'Read current sellable inventory for a product SKU.'),
      ],
    });
    expect(result.route).toBe('web_multi_source');
    expect(result.capabilities.map(({ name }) => name)).toEqual(['get_inventory']);
    expect(result.useKnowledge).toBe(true);
    expect(result.sources.map(({ source }) => source)).toEqual([
      'conversation',
      'knowledge',
      'live_read',
    ]);
  });

  it('answers order field discovery directly without leaking tool planning', () => {
    const result = planWebAgentTurn({
      message: 'What information do you need to check an order?',
      availableCapabilities: [],
    });
    expect(result.directReply).toBe(
      'Please share the order ID and the email used at checkout, and I’ll check it for you.',
    );
    expect(result.controlledActions).toEqual(['check_order_status']);
  });

  it('turns an explicit page request into a same-origin advertised navigation command', () => {
    const result = planWebAgentTurn({
      message: 'Please open the Agents page and create a Web Agent for me.',
      availableCapabilities: [],
      pageContext,
      platformMode: true,
    });
    expect(result.clientCommands).toEqual([
      {
        type: 'navigate',
        label: 'Agents',
        url: 'https://app.voomate.test/agents',
        intent: 'web',
      },
    ]);
    expect(result.responseGuidance).toContain('available agent type from the catalog');
    expect(result.directReply).toContain('Choose Web Agent from the catalog');
    expect(result.sources.map(({ source }) => source)).toContain('page_context');
  });

  it('repairs a bounded misspelling of navigate before resolving an advertised route', () => {
    const result = planWebAgentTurn({
      message: 'Please navagaet me to the agent page.',
      availableCapabilities: [],
      pageContext,
      platformMode: true,
    });
    expect(result.clientCommands).toEqual([
      {
        type: 'navigate',
        label: 'Agents',
        url: 'https://app.voomate.test/agents',
        intent: 'web',
      },
    ]);
    expect(result.directReply).toBe('Opening Agents.');
  });

  it('navigates the exact redirect typo observed in production without a model call', () => {
    const result = planWebAgentTurn({
      message: 'ok so can you pleace rediect me to agants page i',
      availableCapabilities: [],
      pageContext,
      platformMode: true,
    });
    expect(result.clientCommands).toEqual([
      {
        type: 'navigate',
        label: 'Agents',
        url: 'https://app.voomate.test/agents',
        intent: 'web',
      },
    ]);
    expect(result.directReply).toBe('Opening Agents.');
  });

  it('repairs the rediet typo and a noisy Product destination without a model call', () => {
    const result = planWebAgentTurn({
      message: 'can you pleace rediet me to proding pages',
      availableCapabilities: [],
      pageContext,
      platformMode: true,
    });
    expect(result.clientCommands).toEqual([
      {
        type: 'navigate',
        label: 'Product',
        url: 'https://app.voomate.test/product',
        intent: 'web',
      },
    ]);
    expect(result.directReply).toBe('Opening Product.');
  });

  it('answers how Voomate works from host-curated Product facts without navigating', () => {
    const result = planWebAgentTurn({
      message: 'how voomate works',
      availableCapabilities: [],
      pageContext,
      platformMode: true,
    });
    expect(result.clientCommands).toEqual([]);
    expect(result.destinationDecision).toMatchObject({
      request: 'information',
      outcome: 'resolved',
      label: 'Product',
    });
    expect(result.directReply).toContain('Web Agent, Voice Calling Agent, and Integration Agent');
    expect(result.directReply).toContain('business in control');
  });

  it('uses page context to explain the current dashboard', () => {
    const result = planWebAgentTurn({
      message: 'What is this dashboard about and how do I use it?',
      availableCapabilities: [],
      pageContext,
      platformMode: true,
    });
    expect(result.route).toBe('web_page_assistance');
    expect(result.usePageContext).toBe(true);
    expect(result.useKnowledge).toBe(false);
    expect(result.directReply).toBe('You’re on Overview — A live operating overview of Voomate.');
  });

  it('keeps a greeting and a current-page answer short and separate', () => {
    const result = planWebAgentTurn({
      message: 'Hi, how are you? Can you please tell me which page I am on?',
      availableCapabilities: [],
      pageContext,
      platformMode: true,
    });
    expect(result.useKnowledge).toBe(false);
    expect(result.directReply).toBe(
      'Hi! I’m doing well.\n\nYou’re on Overview — A live operating overview of Voomate.',
    );
    expect(result.directReply).not.toContain('Available here:');
  });

  it('does not let the current page override an explicit pricing question', () => {
    const approvalsContext: WebAgentPageContext = {
      ...pageContext,
      title: 'Approvals',
      description:
        'Review sensitive write actions that require an explicit human confirmation gate.',
      surface: {
        id: 'approvals',
        title: 'Approvals',
        description:
          'Review sensitive write actions that require an explicit human confirmation gate.',
      },
      navigation: pageContext.navigation.filter(({ label }) => label !== 'Pricing'),
    };
    const result = planWebAgentTurn({
      message: 'No, I mean what is the pricing of this Web Agent?',
      availableCapabilities: [],
      pageContext: approvalsContext,
      platformMode: true,
    });
    expect(result.useKnowledge).toBe(true);
    expect(result.usePageContext).toBe(true);
    expect(result.directReply).toBeUndefined();
    expect(result.executionSteps).toContainEqual({ kind: 'knowledge', execution: 'retrieval' });
  });

  it('treats a speech-like request about an unseen overview as page assistance', () => {
    const result = planWebAgentTurn({
      message: "Vy overview, I can't see any overview panel.",
      availableCapabilities: [],
      pageContext,
      platformMode: true,
    });
    expect(result.directReply).toContain('Overview — A live operating overview of Voomate.');
    expect(result.directReply).not.toContain('Available here:');
  });

  it('guides setup from the public site without claiming private workspace access', () => {
    const result = planWebAgentTurn({
      message: 'Can you help me set up our account and connect my business as agents?',
      availableCapabilities: [],
      pageContext: landingPageContext,
      platformMode: true,
    });
    expect(result.directReply).toContain('Create an account or sign in');
    expect(result.directReply).toContain('signed-in assistant will check');
    expect(result.directReply).not.toContain('not supported');
    expect(result.platformJourney).toEqual({
      kind: 'workspace_setup',
      stage: 'public_site',
      accountState: 'unavailable',
      nextAction: 'sign_in',
    });
  });

  it('starts with Add agent when the signed-in workspace is empty', () => {
    const result = planWebAgentTurn({
      message: 'How do I set up my business?',
      availableCapabilities: [],
      pageContext: dashboardContext(0),
      platformMode: true,
    });
    expect(result.directReply).toContain('no agents yet');
    expect(result.directReply).toContain('choose Add agent');
    expect(result.sources.map(({ source }) => source)).toContain('operating_state');
    expect(result.platformJourney).toMatchObject({
      accountState: 'empty',
      nextAction: 'add_agent',
    });
  });

  it('continues existing configuration when agents already exist', () => {
    const result = planWebAgentTurn({
      message: 'Help me configure my Voomate account',
      availableCapabilities: [],
      pageContext: dashboardContext(3, 2, 1),
      platformMode: true,
    });
    expect(result.directReply).toContain('already has 3 agents');
    expect(result.directReply).toContain('configure the existing Web Agent');
    expect(result.platformJourney).toMatchObject({
      accountState: 'configured',
      nextAction: 'configure_agent',
    });
  });

  it('answers agent inventory only from signed-in count state', () => {
    const publicResult = planWebAgentTurn({
      message: 'Do I have any agents configured?',
      availableCapabilities: [],
      pageContext: landingPageContext,
      platformMode: true,
    });
    expect(publicResult.directReply).toContain('can’t inspect a private workspace');

    const dashboardResult = planWebAgentTurn({
      message: 'Do I have any agents configured?',
      availableCapabilities: [],
      pageContext: dashboardContext(4, 2, 1),
      platformMode: true,
    });
    expect(dashboardResult.directReply).toContain('4 agents: 2 active, 1 draft, and 1 paused');
  });

  it('synthesizes the founder purpose as specific operating principles', () => {
    const result = planWebAgentTurn({
      message: 'Why did the founders build Voomate, and what is the real point?',
      availableCapabilities: [],
      pageContext,
      platformMode: true,
    });
    expect(result.directReply).toContain('small and medium businesses');
    expect(result.directReply).toContain('trust the foundation');
  });

  it('does not expose unrelated customer data tools to a social turn', () => {
    const result = planWebAgentTurn({
      message: 'Hello, how are you?',
      availableCapabilities: [capability('get_order', 'Read the current status of an order.')],
    });
    expect(result).toMatchObject({ route: 'web', selection: 'not_relevant' });
    expect(result.capabilities).toEqual([]);
  });

  it('caps the model-visible tool surface', () => {
    const capabilities = Array.from({ length: 12 }, (_, index) =>
      capability(`search_product_${String(index)}`, 'Search current product availability.'),
    );
    expect(
      planWebAgentTurn({ message: 'Search products', availableCapabilities: capabilities })
        .capabilities,
    ).toHaveLength(8);
  });

  it.each([
    'What is the pricing?',
    'How much does pricing cost?',
    'Tell me about the Pricing page.',
    'Compare your pricing plans.',
  ])('keeps information-only pricing requests in the widget: %s', (message) => {
    const result = planWebAgentTurn({ message, availableCapabilities: [], pageContext });
    expect(result.clientCommands).toEqual([]);
    expect(result.useKnowledge).toBe(false);
    expect(result.usePageContext).toBe(true);
    expect(result.responseGuidance).toContain('host-curated Pricing facts');
  });

  it('splits the exact identity and navigation request into ordered deterministic work', () => {
    const result = planWebAgentTurn({
      message: 'What is your name, can you please redirect me to pricing pages?',
      availableCapabilities: [],
      pageContext,
      agentName: 'Voomate',
      businessName: 'Voomate',
    });
    expect(result.clientCommands).toMatchObject([
      { type: 'navigate', label: 'Pricing', intent: 'web' },
    ]);
    expect(result.directReply).toBe(
      'Opening Pricing.\n\nI’m Voomate, the assistant for this site.',
    );
    expect(result.useKnowledge).toBe(false);
    expect(result.executionSteps).toEqual([
      { kind: 'navigate', execution: 'client_command', label: 'Pricing' },
      { kind: 'identity', execution: 'deterministic_reply' },
    ]);
  });

  it('navigates first and continues with verified page facts for a combined request', () => {
    const result = planWebAgentTurn({
      message: 'Open Pricing and tell me what it costs.',
      availableCapabilities: [],
      pageContext,
    });
    expect(result.clientCommands).toMatchObject([
      { type: 'navigate', label: 'Pricing', intent: 'web' },
    ]);
    expect(result.directReply).toContain('Opening Pricing.');
    expect(result.directReply).toContain('Growth costs ₹2,499 per month.');
    expect(result.useKnowledge).toBe(false);
    expect(result.destinationDecision).toMatchObject({
      request: 'navigation',
      outcome: 'resolved',
      label: 'Pricing',
    });
    expect(result.executionSteps).toEqual([
      { kind: 'navigate', execution: 'client_command', label: 'Pricing' },
      { kind: 'page_facts', execution: 'deterministic_reply', label: 'Pricing' },
    ]);
  });

  it('answers from curated pricing facts without redirecting in platform mode', () => {
    const result = planWebAgentTurn({
      message: 'How much does pricing cost?',
      availableCapabilities: [],
      pageContext,
      platformMode: true,
    });
    expect(result.clientCommands).toEqual([]);
    expect(result.directReply).toContain('Starter is free.');
    expect(result.directReply).toContain('Growth costs ₹2,499 per month.');
  });

  it.each(['Take me to Pricing.', 'Go to the Pricing page.', 'Open Pricing.', 'Visit Pricing.'])(
    'navigates only for explicit movement: %s',
    (message) => {
      const result = planWebAgentTurn({ message, availableCapabilities: [], pageContext });
      expect(result.clientCommands).toMatchObject([
        { type: 'navigate', label: 'Pricing', intent: 'web' },
      ]);
      expect(result.directReply).toBe('Opening Pricing.');
    },
  );

  it('repairs the real misspelled pricing request without asking for a URL', () => {
    const result = planWebAgentTurn({
      message: 'hi can you place take me to priing pages',
      availableCapabilities: [],
      pageContext,
    });
    expect(result.clientCommands).toMatchObject([
      { type: 'navigate', label: 'Pricing', url: 'https://app.voomate.test/pricing' },
    ]);
    expect(result.directReply).toBe('Opening Pricing.');
  });

  it('routes a partial redirect typo to an advertised About page without a model call', () => {
    const result = planWebAgentTurn({
      message: 'now can you redirec tme about page',
      availableCapabilities: [],
      pageContext: {
        ...pageContext,
        navigation: [
          ...pageContext.navigation,
          { label: 'About', url: 'https://app.voomate.test/about', aliases: ['company'] },
        ],
      },
    });
    expect(result.clientCommands).toMatchObject([
      { type: 'navigate', label: 'About', intent: 'web' },
    ]);
    expect(result.directReply).toBe('Opening About.');
    expect(result.useKnowledge).toBe(false);
  });

  it('clarifies ambiguous destinations and never asks the visitor for a URL', () => {
    const result = planWebAgentTurn({
      message: 'Open agent.',
      availableCapabilities: [],
      pageContext: {
        ...pageContext,
        navigation: [
          ...pageContext.navigation,
          { label: 'Web Agent', url: 'https://app.voomate.test/agents/web' },
        ],
      },
    });
    expect(result.clientCommands).toEqual([]);
    expect(result.directReply).toContain('Did you mean');
    expect(result.directReply).not.toContain('URL');
  });

  it('lists verified destinations instead of requesting a URL for an unknown page', () => {
    const result = planWebAgentTurn({
      message: 'Take me to refunds.',
      availableCapabilities: [],
      pageContext,
    });
    expect(result.clientCommands).toEqual([]);
    expect(result.directReply).toContain('I can open');
    expect(result.directReply).not.toContain('URL');
  });

  it('selects native and official store intents without exposing arbitrary destinations', () => {
    expect(
      planWebAgentTurn({
        message: 'Open Pricing in the mobile app.',
        availableCapabilities: [],
        pageContext,
      }).clientCommands,
    ).toMatchObject([{ intent: 'open_app', label: 'Pricing' }]);
    expect(
      planWebAgentTurn({
        message: 'Install the app from Pricing.',
        availableCapabilities: [],
        pageContext,
      }).clientCommands,
    ).toMatchObject([{ intent: 'install_app', label: 'Pricing' }]);
  });
});
