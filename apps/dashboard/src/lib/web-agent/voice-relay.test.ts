import { describe, expect, it } from 'vitest';
import { isSupportedVoiceRelayRequest } from './voice-relay';

describe('voice relay request allow-list', () => {
  it('allows the complete WebRTC handshake', () => {
    expect(isSupportedVoiceRelayRequest('POST', 'start')).toBe(true);
    expect(isSupportedVoiceRelayRequest('POST', 'sessions/a1b2-c3d4/api/offer')).toBe(true);
    expect(isSupportedVoiceRelayRequest('PATCH', 'sessions/a1b2-c3d4/api/offer')).toBe(true);
  });

  it('rejects every other route and method', () => {
    expect(isSupportedVoiceRelayRequest('PATCH', 'start')).toBe(false);
    expect(isSupportedVoiceRelayRequest('GET', 'sessions/a1b2-c3d4/api/offer')).toBe(false);
    expect(isSupportedVoiceRelayRequest('POST', 'sessions/a1b2-c3d4/api/other')).toBe(false);
    expect(isSupportedVoiceRelayRequest('POST', 'sessions/../api/offer')).toBe(false);
  });
});
