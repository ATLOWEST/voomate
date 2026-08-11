import type { AgentId, OrganizationId } from '@voomate/core';
import { describe, expect, it } from 'vitest';
import { mintWidgetToken, verifyWidgetToken, type WidgetSessionClaims } from './token.js';

const SECRET = 'a-test-secret-that-is-at-least-32-characters-long';
const OTHER_SECRET = 'a-different-secret-also-at-least-32-chars-long';

const CLAIMS: WidgetSessionClaims = {
  agentId: 'agent-123' as AgentId,
  organizationId: 'org-456' as OrganizationId,
  origin: 'https://shop.example.com',
  channel: 'voice',
};

const mint = (over: Partial<WidgetSessionClaims> = {}, ttlSeconds = 900): Promise<string> =>
  mintWidgetToken({ ...CLAIMS, ...over }, { secret: SECRET, ttlSeconds }).then(
    (result) => result.token,
  );

describe('mintWidgetToken', () => {
  it('round-trips the claims a session needs', async () => {
    const token = await mint();
    const claims = await verifyWidgetToken(token, { origin: CLAIMS.origin }, { secret: SECRET });

    expect(claims).toEqual(CLAIMS);
  });

  it('reports the lifetime so the widget can refresh before it expires', async () => {
    const { expiresIn } = await mintWidgetToken(CLAIMS, { secret: SECRET, ttlSeconds: 600 });
    expect(expiresIn).toBe(600);
  });

  it('keeps nothing secret in the token', async () => {
    // Tokens live in browser memory and travel in a URL fragment. Anything private in here is
    // effectively published.
    const token = await mint();
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;

    expect(Object.keys(payload).sort()).toEqual([
      'aud',
      'channel',
      'exp',
      'iat',
      'iss',
      'org',
      'origin',
      'sub',
    ]);
  });
});

describe('verifyWidgetToken', () => {
  it('refuses a token used from a different website', async () => {
    // The whole design. A token lifted from a merchant's page must be useless anywhere else,
    // because a voice session costs real money per minute.
    const token = await mint();

    await expect(
      verifyWidgetToken(token, { origin: 'https://attacker.example' }, { secret: SECRET }),
    ).rejects.toThrow(/not valid/i);
  });

  it('refuses a request with no origin at all', async () => {
    const token = await mint();
    await expect(
      verifyWidgetToken(token, { origin: undefined }, { secret: SECRET }),
    ).rejects.toThrow(/not valid/i);
  });

  it('refuses a token signed with a different secret', async () => {
    const token = await mint();
    await expect(
      verifyWidgetToken(token, { origin: CLAIMS.origin }, { secret: OTHER_SECRET }),
    ).rejects.toThrow(/not valid/i);
  });

  it('refuses a tampered payload', async () => {
    const token = await mint();
    const [header, payload, signature] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload!, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    decoded['org'] = 'org-belonging-to-somebody-else';
    const forged = Buffer.from(JSON.stringify(decoded)).toString('base64url');

    await expect(
      verifyWidgetToken(
        `${header}.${forged}.${signature}`,
        { origin: CLAIMS.origin },
        { secret: SECRET },
      ),
    ).rejects.toThrow(/not valid/i);
  });

  it('refuses an expired token', async () => {
    // Negative TTL: jose backdates the expiry, which is the only way to test this without
    // sleeping or faking the clock inside a crypto library.
    const token = await mint({}, -60);
    await expect(
      verifyWidgetToken(token, { origin: CLAIMS.origin }, { secret: SECRET }),
    ).rejects.toThrow(/not valid/i);
  });

  it('refuses a token that is not a token', async () => {
    await expect(
      verifyWidgetToken('nonsense', { origin: CLAIMS.origin }, { secret: SECRET }),
    ).rejects.toThrow(/not valid/i);
  });

  it('says nothing about why it refused', async () => {
    // "Expired" tells an attacker to find a fresher one; "bad signature" tells them the token
    // shape was right. One message for every failure.
    const expired = await mint({}, -60);
    const forged = await mintWidgetToken(CLAIMS, { secret: OTHER_SECRET, ttlSeconds: 900 });

    const messages = await Promise.all(
      [expired, forged.token, 'nonsense'].map((token) =>
        verifyWidgetToken(token, { origin: CLAIMS.origin }, { secret: SECRET }).then(
          () => 'accepted',
          (error: Error) => error.message,
        ),
      ),
    );

    expect(new Set(messages).size).toBe(1);
  });

  it('carries the channel through, so a text token cannot open a voice session', async () => {
    const token = await mint({ channel: 'text' });
    const claims = await verifyWidgetToken(token, { origin: CLAIMS.origin }, { secret: SECRET });
    expect(claims.channel).toBe('text');
  });
});
