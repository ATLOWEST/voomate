import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyWhatsAppSignature } from './routes.js';

const secret = 'whatsapp-test-secret-that-is-at-least-32-characters';
const body = Buffer.from('{"message":"hello"}');

describe('verifyWhatsAppSignature', () => {
  it('accepts the exact raw body with a valid provider signature', () => {
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
    expect(verifyWhatsAppSignature(body, signature, secret)).toBe(true);
  });

  it('rejects tampering, malformed headers, and missing configuration', () => {
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
    expect(verifyWhatsAppSignature(Buffer.from('{"message":"changed"}'), signature, secret)).toBe(
      false,
    );
    expect(verifyWhatsAppSignature(body, 'sha256=bad', secret)).toBe(false);
    expect(verifyWhatsAppSignature(body, signature, undefined)).toBe(false);
    expect(verifyWhatsAppSignature(body, signature, 'short')).toBe(false);
  });
});
