import { describe, expect, it } from 'vitest';
import type { WebAgentPageContext } from './page-context';
import { resolveDestination } from './destination-resolver';

const pageContext: WebAgentPageContext = {
  url: 'https://app.example/',
  title: 'Overview',
  description: '',
  headings: [],
  navigation: [
    {
      label: 'Overview',
      url: 'https://app.example/',
      aliases: ['dashboard', 'home'],
    },
    {
      label: 'Agents',
      url: 'https://app.example/agents',
      aliases: ['agent board', 'AI team'],
    },
    {
      label: 'Web Agent',
      url: 'https://app.example/agents/web',
      aliases: ['chat agent', 'website agent'],
    },
    {
      label: 'Web Agent Playground',
      url: 'https://app.example/agents/web/playground',
      aliases: ['test web agent', 'chat playground'],
    },
    {
      label: 'Pricing',
      url: 'https://app.example/pricing',
      aliases: ['plans', 'billing plans', 'price'],
    },
    {
      label: 'Product',
      url: 'https://app.example/product',
      aliases: ['features', 'how it works'],
    },
    {
      label: 'Conversations',
      url: 'https://app.example/conversations',
      aliases: ['customer chats', 'conversation history'],
    },
    { label: 'Logs', url: 'https://app.example/logs', aliases: ['traces', 'audit trail'] },
  ],
};

describe('destination resolver', () => {
  it.each([
    ['hi can you place take me to priing pages', 'Pricing'],
    ['please go to the dashbaord', 'Overview'],
    ['open converstions', 'Conversations'],
    ['visit the audti trail', 'Logs'],
    ['take me to billing plans', 'Pricing'],
    ['open the chat agent', 'Web Agent'],
    ['open the web agent playgrond', 'Web Agent Playground'],
  ])('repairs bounded phrasing and spelling noise: %s', (message, label) => {
    expect(resolveDestination(message, pageContext, 'navigation')).toMatchObject({
      kind: 'resolved',
      destination: { label },
    });
  });

  it('prioritizes the destination clause over a later requested task', () => {
    expect(
      resolveDestination(
        'Open the Agents page and create a Web Agent for me.',
        pageContext,
        'navigation',
      ),
    ).toMatchObject({ kind: 'resolved', destination: { label: 'Agents' } });
  });

  it('uses aliases for informational requests without changing their intent', () => {
    expect(
      resolveDestination('How much are your billing plans?', pageContext, 'information'),
    ).toMatchObject({
      kind: 'resolved',
      destination: { label: 'Pricing' },
    });
  });

  it('ignores grammatical words when resolving an informational destination', () => {
    expect(
      resolveDestination(
        'What is the pricing and how much does it cost?',
        pageContext,
        'information',
      ),
    ).toMatchObject({ kind: 'resolved', destination: { label: 'Pricing' } });
  });

  it.each(['open agent', 'take me to a page', 'go somewhere useful'])(
    'does not guess an ambiguous or unnamed destination: %s',
    (message) => {
      expect(resolveDestination(message, pageContext, 'navigation').kind).not.toBe('resolved');
    },
  );

  it('never resolves a plausible word to an unadvertised route', () => {
    expect(resolveDestination('take me to refunds', pageContext, 'navigation')).toMatchObject({
      kind: 'none',
      reason: 'below_threshold',
    });
  });

  it('strictly keeps navigation inside the current portal while repairing compound voice typos', () => {
    const multiPortal: WebAgentPageContext = {
      url: 'https://app.example/admin/merchants',
      portalScope: '/admin',
      activeRole: 'super_admin',
      title: 'Merchants',
      description: '',
      headings: [],
      navigation: [
        {
          label: 'Agent Fleet & LLMs',
          url: 'https://app.example/admin/agents',
          portalScope: '/admin',
          aliases: ['agent fleet', 'llm fleet'],
        },
        {
          label: 'Agents',
          url: 'https://app.example/agents',
          portalScope: '/',
          aliases: ['agent board'],
        },
      ],
    };
    expect(
      resolveDestination(
        'hey please redirect this to agabt fellet page',
        multiPortal,
        'navigation',
      ),
    ).toMatchObject({
      kind: 'resolved',
      destination: { label: 'Agent Fleet & LLMs' },
    });
    expect(resolveDestination('open merchant agents', multiPortal, 'navigation')).not.toMatchObject(
      {
        kind: 'resolved',
        destination: { label: 'Agents' },
      },
    );
  });
});
