import { describe, expect, it } from 'vitest';
import { authorizeLiveRead } from './live-read-policy';

const base = {
  organizationId: 'tenant-a',
  agentId: 'web-agent-a',
  connectionId: 'connection-a',
  connectionOrganizationId: 'tenant-a',
  connectionAgentId: 'web-agent-a',
  connectionActive: true,
  capability: {
    name: 'get_inventory',
    description: 'Read current sellable inventory for one product.',
    sensitivity: 'public' as const,
    parameters: {},
    publicFields: ['available'],
  },
  inputFields: [] as string[],
};

describe('live-read Cedar policy', () => {
  it('permits an active tenant and agent bound public read', async () => {
    await expect(authorizeLiveRead(base)).resolves.toMatchObject({
      allowed: true,
      reason: 'permit',
    });
  });

  it('denies a cross-tenant or cross-agent connection', async () => {
    await expect(
      authorizeLiveRead({ ...base, connectionOrganizationId: 'tenant-b' }),
    ).resolves.toMatchObject({ allowed: false, reason: 'default_deny' });
    await expect(
      authorizeLiveRead({ ...base, connectionAgentId: 'integration-agent-b' }),
    ).resolves.toMatchObject({ allowed: false, reason: 'default_deny' });
  });

  it('denies inactive connections', async () => {
    await expect(authorizeLiveRead({ ...base, connectionActive: false })).resolves.toMatchObject({
      allowed: false,
      reason: 'default_deny',
    });
  });

  it('requires every verification field for customer-sensitive reads', async () => {
    const customerRead = {
      ...base,
      capability: {
        ...base.capability,
        sensitivity: 'customer' as const,
        verificationFields: ['order_id', 'email'],
      },
    };
    await expect(
      authorizeLiveRead({ ...customerRead, inputFields: ['order_id'] }),
    ).resolves.toMatchObject({ allowed: false });
    await expect(
      authorizeLiveRead({ ...customerRead, inputFields: ['email', 'order_id'] }),
    ).resolves.toMatchObject({ allowed: true });
  });
});
