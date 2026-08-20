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
