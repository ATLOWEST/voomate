import { describe, expect, it } from 'vitest';
import { sanitizePageContext, type WebAgentPageContext } from './page-context';

describe('Web Agent page context', () => {
  it('keeps only URLs bound to the widget session origin', () => {
    const input: WebAgentPageContext = {
      url: 'https://app.example/dashboard',
      title: 'Dashboard',
      description: '',
      headings: ['Overview'],
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
});
