import { describe, expect, it } from 'vitest';
import { decodeJwt, jwtVerify } from 'jose';
import { fingerprintExternalUser, mintWebAgentIdentity } from './identity.js';

const secret = 'test-secret-that-is-at-least-thirty-two-characters';
const claims = {
  organizationId: '22222222-2222-4222-8222-222222222222',
  agentId: '11111111-1111-4111-8111-111111111111',
  origin: 'https://app.example.com',
  externalUserId: 'private-user-123',
};

describe('web agent end-user identity', () => {
  it('never copies the merchant user ID into the browser token', async () => {
    const result = await mintWebAgentIdentity(claims, { secret, ttlSeconds: 60 });
    const payload = decodeJwt(result.token);

    expect(JSON.stringify(payload)).not.toContain(claims.externalUserId);
    expect(payload.userFingerprint).toBe(fingerprintExternalUser(claims, secret));
  });

  it('binds identity to the agent, tenant and approved origin', async () => {
    const result = await mintWebAgentIdentity(claims, { secret, ttlSeconds: 60 });
    const verified = await jwtVerify(result.token, new TextEncoder().encode(secret), {
      issuer: 'voomate-web-agent-identity',
      audience: 'voomate-web-agent-sdk',
    });

    expect(verified.payload).toMatchObject({
      organizationId: claims.organizationId,
      agentId: claims.agentId,
      origin: claims.origin,
      purpose: 'web-agent-user-identity',
    });
  });
});
