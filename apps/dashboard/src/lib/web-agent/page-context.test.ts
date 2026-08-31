import { describe, expect, it } from 'vitest';
import { pageContextSchema, sanitizePageContext, type WebAgentPageContext } from './page-context';

describe('Web Agent page context', () => {
  it('keeps only URLs bound to the widget session origin', () => {
    const input: WebAgentPageContext = {
      url: 'https://app.example/dashboard',
      title: 'Dashboard',
      description: '',
      headings: ['Overview'],
      operatingState: {
        source: 'host_ui',
        agentInventory: { total: 2, active: 1, draft: 1, paused: 0 },
      },
      navigation: [
        {
          label: 'Agents',
          url: 'https://app.example/agents',
          aliases: ['agent board'],
          native: {
            ios: {
              url: 'https://native.example/agents',
              storeUrl: 'https://apps.apple.com/app/id123456789',
            },
          },
        },
        { label: 'Unsafe', url: 'https://evil.example/agents' },
      ],
    };
    expect(sanitizePageContext(input, 'https://app.example')?.navigation).toEqual([
      {
        label: 'Agents',
        url: 'https://app.example/agents',
        portalScope: '/',
        navigationKind: 'same_origin',
        aliases: ['agent board'],
        native: {
          ios: {
            url: 'https://native.example/agents',
            storeUrl: 'https://apps.apple.com/app/id123456789',
          },
        },
      },
    ]);
    expect(sanitizePageContext(input, 'https://other.example')).toBeUndefined();
  });

  it('keeps an explicit cross-origin handoff only when the tenant policy enables that route', () => {
    const input = pageContextSchema.parse({
      url: 'https://www.example.com/pricing',
      title: 'Pricing',
      description: '',
      headings: [],
      navigation: [
        { label: 'Dashboard', url: 'https://app.example.com/' },
        { label: 'Unsafe', url: 'https://evil.example.com/' },
      ],
    });
    const policy = {
      version: 1 as const,
      surfaces: [
        {
          id: 'marketing',
          name: 'Marketing site',
          kind: 'declared' as const,
          origin: 'https://www.example.com',
          pathPrefixes: ['/'],
          excludedPaths: [],
          excludedPathPrefixes: [],
          enabled: true,
        },
        {
          id: 'dashboard',
          name: 'Dashboard',
          kind: 'declared' as const,
          origin: 'https://app.example.com',
          pathPrefixes: ['/'],
          excludedPaths: [],
          excludedPathPrefixes: [],
          identity: 'required' as const,
          enabled: true,
        },
      ],
    };
    expect(sanitizePageContext(input, 'https://www.example.com', policy)?.navigation).toEqual([
      {
        label: 'Dashboard',
        url: 'https://app.example.com/',
        portalScope: '/',
        navigationKind: 'trusted_handoff',
      },
    ]);
  });

  it('derives portal and role from the verified current URL rather than browser input', () => {
    const context = pageContextSchema.parse({
      url: 'https://app.example/admin/merchants',
      title: 'Merchants',
      description: '',
      headings: [],
      portalScope: '/store',
      activeRole: 'end_user',
      navigation: [
        { label: 'Agent Fleet', url: 'https://app.example/admin/agents', portalScope: '/store' },
      ],
    });
    expect(sanitizePageContext(context, 'https://app.example')).toMatchObject({
      portalScope: '/admin',
      activeRole: 'super_admin',
      navigation: [{ portalScope: '/admin' }],
    });
  });

  it('rejects inconsistent agent inventory counts', () => {
    const input = {
      url: 'https://app.example/agents',
      title: 'Agents',
      description: '',
      headings: [],
      navigation: [],
      operatingState: {
        source: 'host_ui',
        agentInventory: { total: 2, active: 2, draft: 1, paused: 0 },
      },
    };
    expect(() => pageContextSchema.parse(input)).toThrow('Agent inventory counts');
  });
});
