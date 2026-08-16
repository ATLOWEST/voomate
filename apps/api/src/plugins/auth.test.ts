import { SignJWT } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const secret = 'test-supabase-jwt-secret-at-least-32-characters';
const issuer = 'https://security-test.supabase.co/auth/v1';

const sign = async (claims: { issuer?: string; audience?: string } = {}) =>
  new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('00000000-0000-4000-8000-000000000001')
    .setIssuer(claims.issuer ?? issuer)
    .setAudience(claims.audience ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret));

describe('Supabase access-token verification', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('SUPABASE_URL', 'https://security-test.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'test-anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
    vi.stubEnv('SUPABASE_JWT_SECRET', secret);
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/voomate_test');
  });

  it('accepts a correctly signed token with the expected issuer and audience', async () => {
    const { __testing } = await import('./auth.js');
    await expect(__testing.verifyToken(await sign())).resolves.toMatchObject({
      sub: '00000000-0000-4000-8000-000000000001',
      iss: issuer,
      aud: 'authenticated',
    });
  });

  it('rejects a valid signature from the wrong issuer', async () => {
    const { __testing } = await import('./auth.js');
    await expect(
      __testing.verifyToken(await sign({ issuer: 'https://attacker.example/auth/v1' })),
    ).rejects.toThrow();
  });

  it('rejects a valid signature for the wrong audience', async () => {
    const { __testing } = await import('./auth.js');
    await expect(__testing.verifyToken(await sign({ audience: 'service_role' }))).rejects.toThrow();
  });
});
