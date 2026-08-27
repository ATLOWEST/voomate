import { afterEach, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import {
  mintWidgetSession,
  mintWidgetContinuation,
  normalizeOrigin,
  streamMessageRequestSchema,
  verifyWidgetSession,
  verifyWidgetContinuation,
  verifyWebAgentIdentity,
} from './security';

const previousSecret = process.env.WIDGET_TOKEN_SECRET;

afterEach(() => {
  process.env.WIDGET_TOKEN_SECRET = previousSecret;
});

describe('widget session security', () => {
  it('normalizes HTTPS origins and rejects unsafe schemes', () => {
    expect(normalizeOrigin('https://Shop.Example/path')).toBe('https://shop.example');
    expect(normalizeOrigin('javascript:alert(1)')).toBeUndefined();
    expect(normalizeOrigin('http://shop.example')).toBeUndefined();
    expect(normalizeOrigin('https://client.example/path')).toBe('https://client.example');
  });

  it('binds a short-lived token to the embedding origin', async () => {
    process.env.WIDGET_TOKEN_SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
    const claims = {
      agentId: '11111111-1111-4111-8111-111111111111',
      organizationId: '22222222-2222-4222-8222-222222222222',
      origin: 'https://shop.example',
      keyFingerprint: '0123456789abcdef',
      visitorSessionId: '33333333-3333-4333-8333-333333333333',
      configurationRevision: 4,
      executionLeaseId: '44444444-4444-4444-8444-444444444444',
    };
    const session = await mintWidgetSession(claims);
    await expect(verifyWidgetSession(session.token, claims.origin)).resolves.toMatchObject(claims);
    await expect(verifyWidgetSession(session.token, 'https://evil.example')).rejects.toThrow(
      'origin mismatch',
    );
  });

  it('uses a separate origin-bound token for secure conversation continuation', async () => {
    process.env.WIDGET_TOKEN_SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
    const claims = {
      agentId: '11111111-1111-4111-8111-111111111111',
      organizationId: '22222222-2222-4222-8222-222222222222',
      origin: 'https://shop.example',
      keyFingerprint: '0123456789abcdef',
      visitorSessionId: '33333333-3333-4333-8333-333333333333',
      configurationRevision: 4,
      executionLeaseId: '44444444-4444-4444-8444-444444444444',
    };
    const continuation = await mintWidgetContinuation(claims);
    await expect(
      verifyWidgetContinuation(continuation.token, claims.origin),
    ).resolves.toMatchObject(claims);
    await expect(verifyWidgetSession(continuation.token, claims.origin)).rejects.toThrow();
    await expect(
      verifyWidgetContinuation(continuation.token, 'https://evil.example'),
    ).rejects.toThrow('origin mismatch');
  });

  it('accepts only merchant-server identity tokens bound to this tenant, agent and origin', async () => {
    process.env.WIDGET_TOKEN_SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
    const expected = {
      agentId: '11111111-1111-4111-8111-111111111111',
      organizationId: '22222222-2222-4222-8222-222222222222',
      origin: 'https://shop.example',
    };
    const fingerprint = 'a'.repeat(43);
    const token = await new SignJWT({
      ...expected,
      userFingerprint: fingerprint,
      purpose: 'web-agent-user-identity',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer('voomate-web-agent-identity')
      .setAudience('voomate-web-agent-sdk')
      .setSubject(expected.agentId)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(process.env.WIDGET_TOKEN_SECRET));

    await expect(verifyWebAgentIdentity(token, expected)).resolves.toEqual({
      userFingerprint: fingerprint,
    });
    await expect(
      verifyWebAgentIdentity(token, { ...expected, origin: 'https://evil.example' }),
    ).rejects.toThrow('does not match');
  });

  it('keeps old voice streams compatible and allows explicit text image streams', () => {
    expect(streamMessageRequestSchema.parse({ message: 'Hello' }).channel).toBe('voice');
    expect(
      streamMessageRequestSchema.parse({
        message: 'What is in this image?',
        channel: 'text',
        imageIds: ['11111111-1111-4111-8111-111111111111'],
      }),
    ).toMatchObject({ channel: 'text', imageIds: ['11111111-1111-4111-8111-111111111111'] });
  });

  it('accepts bounded passive page context but rejects undeclared command fields', () => {
    const pageContext = {
      url: 'https://app.example/agents',
      title: 'Agents',
      description: 'Choose, connect, and operate the agents this workspace needs.',
      headings: ['Agents'],
      navigation: [{ label: 'Logs', url: 'https://app.example/logs' }],
      operatingState: {
        source: 'host_ui',
        agentInventory: { total: 1, active: 1, draft: 0, paused: 0 },
      },
    };
    expect(
      streamMessageRequestSchema.parse({ message: 'Explain this page', pageContext }),
    ).toMatchObject({
      pageContext,
    });
    expect(() =>
      streamMessageRequestSchema.parse({
        message: 'Write this',
        pageContext: { ...pageContext, command: { type: 'write' } },
      }),
    ).toThrow();
    expect(() =>
      streamMessageRequestSchema.parse({
        message: 'List my agents',
        pageContext: {
          ...pageContext,
          operatingState: {
            ...pageContext.operatingState,
            agentIds: ['private-agent-id'],
          },
        },
      }),
    ).toThrow();
  });
});
