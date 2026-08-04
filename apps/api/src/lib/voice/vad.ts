/**
 * Is anyone talking right now?
 *
 * Not a transcript — just presence of speech, decided per 20 ms frame. It exists for one
 * reason: the transcript is far too slow to interrupt on. Transcribe's first partial arrives
 * 200–400 ms after someone starts speaking, and a barge-in that takes 400 ms to acknowledge
 * feels like arguing with a machine. Frame energy gives the same signal in about 40 ms, which
 * is fast enough for the agent to duck the moment the visitor opens their mouth.
 *
 * Deliberately not a neural detector. Silero and friends are more accurate on noisy input, but
 * they add a model, a runtime, and tens of milliseconds per frame to buy accuracy we do not
 * need — this decision is only ever "lower the volume and start paying attention", and the
 * turn engine re-decides properly once real words arrive. Being occasionally wrong here is
 * cheap by construction.
 *
 * The noise floor adapts, because a fixed threshold is wrong in both directions: it never
 * triggers in a café and triggers constantly next to an air conditioner.
 */

export interface VadOptions {
  /**
   * How far above the running noise floor counts as speech, in decibels.
   *
   * 9 dB is roughly "clearly louder than the room". Lower makes the agent twitchy; higher
   * makes it miss quiet speakers, which is the worse failure — a quiet interruption ignored
   * is the complaint that the agent talks over people.
   */
  thresholdDb?: number;
  /**
   * Consecutive speech frames before speech is declared. At 20 ms a frame, 2 frames = 40 ms.
   * Guards against a single click or key press.
   */
  onsetFrames?: number;
  /**
   * Silence held before speech is declared over. Must comfortably exceed the pause inside a
   * sentence — 500 ms is a natural breath, and cutting someone off at their own comma is the
   * most irritating thing a voice agent does.
   */
  hangoverMs?: number;
  /** Frames below this are always silence, whatever the floor has adapted to. */
  absoluteFloorDb?: number;
  /**
   * Time spent listening to the room before listening to anyone in it.
   *
   * The session opens with the agent greeting, so this costs nothing — the visitor is not
   * talking yet — and it is what lets the detector work in a café as well as a quiet office.
   */
  calibrationMs?: number;
  /**
   * Continuous "speech" beyond this is not a person; people breathe. It means the floor was
   * learned wrong and the detector is stuck on. Re-calibrating is the way out.
   */
  maxSpeechMs?: number;
}

const DEFAULTS: Required<VadOptions> = {
  thresholdDb: 9,
  onsetFrames: 2,
  hangoverMs: 500,
  absoluteFloorDb: -55,
  calibrationMs: 500,
  maxSpeechMs: 15_000,
};

const INITIAL_FLOOR_DB = -50;

export type VadEvent = 'speech-started' | 'speech-stopped' | null;

/** Root-mean-square level of a PCM frame, in dBFS. Silence is -Infinity. */
export const frameDb = (frame: Int16Array): number => {
  if (frame.length === 0) return Number.NEGATIVE_INFINITY;

  let sumSquares = 0;
  for (const sample of frame) {
    const normalized = sample / 32768;
    sumSquares += normalized * normalized;
  }

  const rms = Math.sqrt(sumSquares / frame.length);
  return rms === 0 ? Number.NEGATIVE_INFINITY : 20 * Math.log10(rms);
};

export class VoiceActivityDetector {
  private readonly options: Required<VadOptions>;
  /** Running estimate of the room. */
  private noiseFloorDb = INITIAL_FLOOR_DB;
  private speaking = false;
  private consecutiveSpeechFrames = 0;
  private silenceMs = 0;
  private speechMs = 0;
  /** Time left in the listen-to-the-room window. Nothing is reported while this runs. */
  private calibratingMs: number;
  /** Quietest frame seen while calibrating — see `calibrate` for why the minimum. */
  private calibrationMin = Number.POSITIVE_INFINITY;

  constructor(options: VadOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
    this.calibratingMs = this.options.calibrationMs;
  }

  get isSpeaking(): boolean {
    return this.speaking;
  }

  get noiseFloor(): number {
    return this.noiseFloorDb;
  }

  /** True while still learning the room. Callers may want to hold off acting on audio. */
  get isCalibrating(): boolean {
    return this.calibratingMs > 0;
  }

  /** Feed one frame. Returns a transition, or null when nothing changed. */
  push(frame: Int16Array, frameMs: number): VadEvent {
    const db = frameDb(frame);

    if (this.calibratingMs > 0) {
      this.calibrate(db, frameMs);
      return null;
    }

    const isSpeech =
      Number.isFinite(db) &&
      db > this.options.absoluteFloorDb &&
      db > this.noiseFloorDb + this.options.thresholdDb;

    // Adapt downward only. Letting speech raise the floor is how a detector talks itself into
    // deafness partway through a long sentence; the stuck-high case is handled by the
    // watchdog below instead, which is the only situation where raising it is ever correct.
    if (!isSpeech && Number.isFinite(db) && db < this.noiseFloorDb) {
      this.noiseFloorDb = this.noiseFloorDb * 0.7 + db * 0.3;
    }

    if (isSpeech) {
      this.silenceMs = 0;
      this.speechMs += frameMs;

      // Nobody talks for fifteen seconds without a breath. The floor is wrong — most likely
      // the room got louder, or capture started mid-noise. Learn it again rather than sitting
      // deaf for the rest of the session.
      if (this.speaking && this.speechMs >= this.options.maxSpeechMs) {
        this.beginCalibration(db);
        this.speaking = false;
        return 'speech-stopped';
      }

      this.consecutiveSpeechFrames += 1;
      if (!this.speaking && this.consecutiveSpeechFrames >= this.options.onsetFrames) {
        this.speaking = true;
        this.speechMs = frameMs * this.options.onsetFrames;
        return 'speech-started';
      }
      return null;
    }

    this.consecutiveSpeechFrames = 0;
    if (!this.speaking) return null;

    this.silenceMs += frameMs;
    if (this.silenceMs >= this.options.hangoverMs) {
      this.speaking = false;
      this.silenceMs = 0;
      this.speechMs = 0;
      return 'speech-stopped';
    }

    return null;
  }

  /**
   * Learn the room from the quietest frame in the window, not the average.
   *
   * If the visitor happens to talk through calibration, an average would learn their voice as
   * the room and go deaf. The minimum lands on a gap between their words instead — and if
   * there genuinely is no quiet moment in half a second, that is a noise the agent should be
   * ignoring anyway.
   */
  private calibrate(db: number, frameMs: number): void {
    if (Number.isFinite(db)) this.calibrationMin = Math.min(this.calibrationMin, db);

    this.calibratingMs -= frameMs;
    if (this.calibratingMs > 0) return;

    if (Number.isFinite(this.calibrationMin)) this.noiseFloorDb = this.calibrationMin;
    this.calibrationMin = Number.POSITIVE_INFINITY;
  }

  private beginCalibration(seedDb: number): void {
    this.calibratingMs = this.options.calibrationMs;
    this.calibrationMin = Number.POSITIVE_INFINITY;
    this.consecutiveSpeechFrames = 0;
    this.silenceMs = 0;
    this.speechMs = 0;
    // Seed from what is actually being heard. Falling back to the initial guess would relearn
    // the same wrong floor and get stuck all over again.
    if (Number.isFinite(seedDb)) this.noiseFloorDb = seedDb;
  }

  /** Between sessions, or after a transport reconnect. */
  reset(): void {
    this.speaking = false;
    this.consecutiveSpeechFrames = 0;
    this.silenceMs = 0;
    this.speechMs = 0;
    this.noiseFloorDb = INITIAL_FLOOR_DB;
    this.calibratingMs = this.options.calibrationMs;
    this.calibrationMin = Number.POSITIVE_INFINITY;
  }
}
