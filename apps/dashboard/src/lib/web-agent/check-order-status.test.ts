import { describe, expect, it } from 'vitest';
import { toPublicOrderStatus } from './check-order-status';

describe('check_order_status public-safe output', () => {
  it('drops internal notes, cost and verification email', () => {
    const result = toPublicOrderStatus({
      id: '11111111-1111-4111-8111-111111111111',
      organizationId: '22222222-2222-4222-8222-222222222222',
      externalOrderId: 'ORD-123',
      verificationEmail: 'private@example.com',
      status: 'shipped',
      orderDate: new Date('2026-08-01T00:00:00Z'),
      estimatedDelivery: new Date('2026-08-13T00:00:00Z'),
      carrier: 'BlueDart',
      trackingNumber: 'AWB123',
      internalNotes: 'High-margin customer. Never expose.',
      costAmount: 129,
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    });

    expect(result).toEqual({
      orderId: 'ORD-123',
      status: 'shipped',
      orderDate: '2026-08-01T00:00:00.000Z',
      estimatedDelivery: '2026-08-13T00:00:00.000Z',
      carrier: 'BlueDart',
      trackingNumber: 'AWB123',
    });
    expect(result).not.toHaveProperty('verificationEmail');
    expect(result).not.toHaveProperty('internalNotes');
    expect(result).not.toHaveProperty('costAmount');
  });
});
