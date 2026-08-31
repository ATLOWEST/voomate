import { createHmac, randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createReadOnlyHandler,
  createCommerceReadOnlyHandler,
  __testing,
  describeReadOnlyEndpoint,
  invokeReadOnlyCapability,
  openConnectionSecret,
  projectPublicFields,
  readOnlyProtocolVersion,
  sealConnectionSecret,
} from './server.js';

const connectionId = 'conn_test_01';
const secret = 'read_secret_that_is_long_enough_for_hmac_testing';

function handler() {
  return createReadOnlyHandler({
    connectionId,
    secret,
    capabilities: {
      get_order: {
        name: 'get_order',
        description: 'Read the public status for one verified customer order.',
        sensitivity: 'customer',
        parameters: {
          order_id: { type: 'string', required: true, description: 'Public order ID' },
          email: { type: 'string', required: true, description: 'Checkout email' },
        },
        verificationFields: ['email'],
        publicFields: ['orderId', 'status', 'delivery.date'],
        read: () => ({
          orderId: 'A-100',
          status: 'shipped',
          delivery: { date: '2026-08-20', internalRoute: 'W9' },
          margin: 81,
          internalNotes: 'never disclose',
        }),
      },
    },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('read-only Connect protocol', () => {
  it('provides a standard read-only commerce capability pack', async () => {
    const commerce = createCommerceReadOnlyHandler({
      connectionId,
      secret,
      commerce: {
        searchProducts: ({ query }) => [
          { id: 'linen-shirt', title: `Linen shirt: ${query}`, displayPrice: '$45', margin: 91 },
        ],
        getOrderStatus: ({ orderId }) => ({
          orderId,
          status: 'shipped',
          trackingUrl: 'https://carrier.example/track/A-100',
          customerPhone: '+1-555-0100',
        }),
      },
    });
    const fetchImpl: typeof fetch = async (input, init) => commerce(new Request(input, init));
    const common = {
      endpoint: 'http://localhost/voomate/read',
      connectionId,
      secret,
      allowInsecureLoopback: true,
      fetchImpl,
    };
    expect((await describeReadOnlyEndpoint(common)).map(({ name }) => name)).toEqual([
      'search_products',
      'get_order_status',
    ]);
    const order = await invokeReadOnlyCapability({
      ...common,
      capability: 'get_order_status',
      input: { order_id: 'A-100', email: 'buyer@example.com' },
    });
    expect(order.data).toEqual({
      orderId: 'A-100',
      status: 'shipped',
      trackingUrl: 'https://carrier.example/track/A-100',
    });
    expect(JSON.stringify(order.data)).not.toContain('customerPhone');
  });

  it('rejects private, carrier-NAT, reserved, and IPv4-mapped endpoint addresses', () => {
    for (const address of [
      '10.0.0.1',
      '100.64.0.1',
      '127.0.0.1',
      '169.254.169.254',
      '172.20.0.1',
      '192.168.1.1',
      '198.18.0.1',
      '::1',
      'fc00::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
    ]) {
      expect(__testing.isPrivateAddress(address), address).toBe(true);
    }
    expect(__testing.isPrivateAddress('8.8.8.8')).toBe(false);
    expect(__testing.isPrivateAddress('2606:4700:4700::1111')).toBe(false);
  });

  it('discovers capabilities and returns only explicitly public fields', async () => {
    const fetchImpl: typeof fetch = async (input, init) => handler()(new Request(input, init));
    const common = {
      endpoint: 'http://localhost/voomate/read',
      connectionId,
      secret,
      allowInsecureLoopback: true,
      fetchImpl,
    };
    const manifest = await describeReadOnlyEndpoint(common);
    expect(manifest.map((item) => item.name)).toEqual(['get_order']);
    const result = await invokeReadOnlyCapability({
      ...common,
      capability: 'get_order',
      input: { order_id: 'A-100', email: 'buyer@example.com' },
    });
    expect(result.data).toEqual({
      orderId: 'A-100',
      status: 'shipped',
      delivery: { date: '2026-08-20' },
    });
    expect(JSON.stringify(result.data)).not.toContain('internal');
    expect(JSON.stringify(result.data)).not.toContain('margin');
  });

  it('denies missing verification and tampered requests without executing a read', async () => {
    const read = vi.fn();
    const secured = createReadOnlyHandler({
      connectionId,
      secret,
      capabilities: {
        customer_record: {
          name: 'customer_record',
          description: 'Read one customer record after explicit verification.',
          sensitivity: 'customer',
          parameters: { email: { type: 'string', required: true, description: 'Verified email' } },
          verificationFields: ['email'],
          publicFields: ['status'],
          read,
        },
      },
    });
    const response = await secured(
      new Request('http://localhost/read', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'query',
          connectionId,
          capability: 'customer_record',
          input: {},
        }),
      }),
    );
    expect(response.status).toBe(401);
    expect(read).not.toHaveBeenCalled();
  });

  it('rejects a correctly signed write operation at the read-only protocol boundary', async () => {
    const read = vi.fn();
    const secured = createReadOnlyHandler({
      connectionId,
      secret,
      capabilities: {
        get_inventory: {
          name: 'get_inventory',
          description: 'Read current sellable inventory for one public product SKU.',
          sensitivity: 'public',
          parameters: {},
          publicFields: ['available'],
          read,
        },
      },
    });
    const body = JSON.stringify({
      operation: 'write',
      connectionId,
      capability: 'get_inventory',
      input: { available: false },
    });
    const timestamp = String(Date.now());
    const nonce = randomBytes(24).toString('base64url');
    const signature = createHmac('sha256', secret)
      .update(`${readOnlyProtocolVersion}.${timestamp}.${nonce}.${body}`)
      .digest('hex');
    const response = await secured(
      new Request('http://localhost/read', {
        method: 'POST',
        headers: {
          'x-voomate-protocol': readOnlyProtocolVersion,
          'x-voomate-timestamp': timestamp,
          'x-voomate-nonce': nonce,
          'x-voomate-signature': `v1=${signature}`,
        },
        body,
      }),
    );
    expect(response.status).toBe(401);
    expect(read).not.toHaveBeenCalled();
  });

  it('projects nested paths and caps arrays before output leaves the client', () => {
    const rows = Array.from({ length: 120 }, (_, index) => ({ id: index, secret: 'x' }));
    const projected = projectPublicFields(rows, ['id']);
    expect(projected).toHaveLength(100);
    expect(JSON.stringify(projected)).not.toContain('secret');
  });

  it('encrypts stored connection secrets with authenticated encryption', () => {
    const key = randomBytes(32).toString('base64');
    const sealed = sealConnectionSecret(secret, key);
    expect(sealed).not.toContain(secret);
    expect(openConnectionSecret(sealed, key)).toBe(secret);
    const parts = sealed.split('.');
    parts[3] = `${parts[3]!.slice(0, -2)}AA`;
    expect(() => openConnectionSecret(parts.join('.'), key)).toThrow();
  });
});
