/**
 * Microphone tap, running on the audio thread.
 *
 * Plain JavaScript, and a real file rather than a generated blob URL, because the iframe's CSP
 * allows scripts from `'self'` only — a blob: worklet is blocked, and the failure surfaces as
 * a microphone that produces nothing with no obvious cause.
 *
 * This does as little as possible. The audio thread must never miss its deadline: a slow
 * `process` does not run late, it drops the block entirely, and dropped blocks are gaps in the
 * middle of the visitor's words. Resampling, conversion and framing all happen on the main
 * thread (see `audio.ts`) where being slow is merely slow.
 */
class PcmTapProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    // No input yet, or the track ended. Staying alive is right: the microphone may be muted,
    // and returning false here would tear down the node permanently.
    if (channel === undefined) return true;

    // A copy. The block is reused by the audio thread the instant this returns, so posting the
    // original would deliver whatever the microphone recorded next instead.
    this.port.postMessage(new Float32Array(channel));
    return true;
  }
}

registerProcessor('pcm-tap', PcmTapProcessor);
