import { describe, expect, it } from 'vitest';
import {
  buildIdentityAssistantPrompt,
  buildIdentityServerExample,
  buildServerSetupSnippet,
  buildVerifiedUserSnippet,
  buildWebAgentAssistantPrompt,
  buildWebAgentSnippet,
  toWebOrigin,
} from './installer';

describe('web-agent installer helpers', () => {
  it('normalizes hostnames and page URLs to browser origins', () => {
    expect(toWebOrigin('example.com/path')).toBe('https://example.com');
    expect(toWebOrigin('https://app.example.com/account?q=1')).toBe('https://app.example.com');
    expect(toWebOrigin('ftp://example.com')).toBeUndefined();
    expect(toWebOrigin('')).toBeUndefined();
  });

  it('builds one public SDK script without a private credential', () => {
    const snippet = buildWebAgentSnippet({
      widgetOrigin: 'https://widget.example.com/',
      embedKey: 'agent_public_123',
    });

    expect(snippet.match(/<script/g)).toHaveLength(1);
    expect(snippet).toContain('src="https://widget.example.com/embed.js"');
    expect(snippet).toContain('data-agent="agent_public_123"');
    expect(snippet).not.toContain('data-setup-endpoint');
    expect(snippet.toLowerCase()).not.toContain('secret');
  });

  it('creates a scoped assistant task with the exact SDK snippet', () => {
    const prompt = buildWebAgentAssistantPrompt({
      widgetOrigin: 'https://widget.example.com',
      embedKey: 'agent_public_123',
      agentName: 'Support Agent',
      approvedOrigins: ['https://www.example.com'],
    });

    expect(prompt).toContain('Support Agent');
    expect(prompt).toContain('data-agent="agent_public_123"');
    expect(prompt).toContain('VOOMATE_API_KEY');
    expect(prompt).toContain('installation-claim API');
    expect(prompt).toContain('Do not create, request, log, or expose any private key');
  });

  it('keeps the server identity key out of the browser SDK', () => {
    const snippet = buildVerifiedUserSnippet({
      widgetOrigin: 'https://widget.example.com',
      embedKey: 'agent_public_123',
    });
    const example = buildIdentityServerExample({
      controlPlaneOrigin: 'https://app.example.com/api',
      approvedOrigins: ['https://shop.example.com'],
    });
    const prompt = buildIdentityAssistantPrompt({
      widgetOrigin: 'https://widget.example.com',
      controlPlaneOrigin: 'https://app.example.com/api',
      embedKey: 'agent_public_123',
      agentName: 'Support Agent',
      approvedOrigins: ['https://shop.example.com'],
    });

    expect(snippet).not.toContain('data-setup-endpoint');
    expect(snippet).not.toContain('VOOMATE_API_KEY');
    expect(example).toContain('process.env.VOOMATE_API_KEY');
    expect(example).toContain('/v1/widget/installations/claim');
    expect(example).toContain('pageUrl.origin !== origin');
    expect(prompt).toContain('Never accept a user ID from the browser');
    expect(prompt).toContain('hosting provider');
  });

  it('generates complete server-only setup files for supported frameworks', () => {
    const input = { controlPlaneOrigin: 'https://app.example.com/api' };
    expect(buildServerSetupSnippet({ ...input, framework: 'nextjs' })).toContain(
      'app/voomate/setup/route.ts',
    );
    expect(buildServerSetupSnippet({ ...input, framework: 'express' })).toContain(
      "app.post('/voomate/setup'",
    );
    expect(buildServerSetupSnippet({ ...input, framework: 'php' })).toContain('curl_init');
  });
});
