const sessionOfferPath = /^sessions\/[A-Za-z0-9-]+\/api\/offer$/;

/**
 * The Pipecat browser client sends an SDP offer with POST, then trickle ICE candidates with
 * PATCH to the same session URL. Keep the relay allow-list deliberately narrow while allowing
 * both parts of that WebRTC handshake.
 */
export function isSupportedVoiceRelayRequest(method: string, requestPath: string): boolean {
  return (
    (method === 'POST' && requestPath === 'start') ||
    ((method === 'POST' || method === 'PATCH') && sessionOfferPath.test(requestPath))
  );
}
