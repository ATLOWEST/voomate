import { describe, expect, it } from 'vitest';
import { buildWebAgentAssistantPrompt, buildWebAgentSnippet, toWebOrigin } from './installer';

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
    expect(prompt).toContain('https://www.example.com');
    expect(prompt).toContain('data-agent="agent_public_123"');
    expect(prompt).toContain('Do not add it to admin-only');
    expect(prompt).toContain('Do not create, request, log, or expose any private key');
  });
});
