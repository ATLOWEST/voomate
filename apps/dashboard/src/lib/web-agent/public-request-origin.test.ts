import { describe, expect, it } from 'vitest';
import { publicRequestOrigin } from './public-request-origin';

describe('publicRequestOrigin', () => {
  it('uses the public proxy origin instead of the private container address', () => {
    const request = new Request('https://ip-10-0-221-213.ec2.internal:3001/api/web-agent/session', {
      headers: {
        'x-forwarded-host': 'app.atlowest.in',
        'x-forwarded-proto': 'https',
      },
    });
    expect(publicRequestOrigin(request)).toBe('https://app.atlowest.in');
  });

  it('uses only the first validated proxy hop', () => {
    const request = new Request('http://localhost:3001/api/web-agent/session', {
      headers: {
        'x-forwarded-host': 'app.atlowest.in, internal.local',
        'x-forwarded-proto': 'https, http',
      },
    });
    expect(publicRequestOrigin(request)).toBe('https://app.atlowest.in');
  });

  it('rejects an unsafe forwarded host', () => {
    const request = new Request('http://localhost:3001/api/web-agent/session', {
      headers: {
        'x-forwarded-host': 'attacker.example/path',
        'x-forwarded-proto': 'https',
      },
    });
    expect(publicRequestOrigin(request)).toBe('http://localhost:3001');
  });
});
