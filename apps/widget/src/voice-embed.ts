import { PipecatClient } from '@pipecat-ai/client-js';
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport';

export interface VoiceSessionOptions {
  endpoint: string;
  sessionToken: string;
  conversationId?: string;
  pageUrl: string;
  audioElement: HTMLAudioElement;
  onState: (state: 'connecting' | 'listening' | 'thinking' | 'speaking' | 'ended') => void;
  onUserTranscript: (text: string, final: boolean) => void;
  onAssistantDelta: (text: string) => void;
  onConversationId: (conversationId: string) => void;
  onAudioLevel?: (source: 'user' | 'assistant', level: number) => void;
  onAudioSpectrum?: (
    source: 'user' | 'assistant',
    spectrum: { bass: number; mid: number; treble: number },
  ) => void;
  onError: (message: string) => void;
}

export interface VoiceSession {
  disconnect(): Promise<void>;
  setMuted(muted: boolean): void;
  readonly muted: boolean;
}

export async function createVoiceSession(options: VoiceSessionOptions): Promise<VoiceSession> {
  let muted = false;
  const spectrumStops = new Map<string, () => void>();

  const startSpectrum = (track: MediaStreamTrack, source: 'user' | 'assistant') => {
    if (!options.onAudioSpectrum || spectrumStops.has(track.id)) return;
    try {
      const context = new AudioContext({ latencyHint: 'interactive' });
      const stream = new MediaStream([track]);
      const input = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.minDecibels = -92;
      analyser.maxDecibels = -18;
      analyser.smoothingTimeConstant = 0.58;
      input.connect(analyser);
      const bins = new Float32Array(analyser.frequencyBinCount);
      let frame = 0;
      let stopped = false;

      const readBand = (minimumHz: number, maximumHz: number) => {
        const nyquist = context.sampleRate / 2;
        const first = Math.max(0, Math.floor((minimumHz / nyquist) * bins.length));
        const last = Math.min(bins.length - 1, Math.ceil((maximumHz / nyquist) * bins.length));
        let total = 0;
        let count = 0;
        for (let index = first; index <= last; index += 1) {
          const decibels = bins[index] ?? analyser.minDecibels;
          const normalized = Math.max(0, Math.min(1, (decibels - analyser.minDecibels) / 74));
          total += normalized * normalized;
          count += 1;
        }
        return count > 0 ? Math.sqrt(total / count) : 0;
      };

      const sample = () => {
        if (stopped) return;
        analyser.getFloatFrequencyData(bins);
        options.onAudioSpectrum?.(source, {
          bass: readBand(75, 320),
          mid: readBand(320, 2_400),
          treble: readBand(2_400, 7_200),
        });
        frame = requestAnimationFrame(sample);
      };

      const stop = () => {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(frame);
        input.disconnect();
        analyser.disconnect();
        spectrumStops.delete(track.id);
        void context.close().catch(() => undefined);
      };
      spectrumStops.set(track.id, stop);
      track.addEventListener('ended', stop, { once: true });
      void context.resume().catch(() => undefined);
      frame = requestAnimationFrame(sample);
    } catch {
      // The existing scalar meter remains the compatibility fallback.
    }
  };

  const client = new PipecatClient({
    transport: new SmallWebRTCTransport(),
    enableMic: true,
    enableCam: false,
    callbacks: {
      onTransportStateChanged: (state) => {
        if (state === 'connecting' || state === 'authenticating') options.onState('connecting');
      },
      onBotReady: () => options.onState('listening'),
      onUserStartedSpeaking: () => options.onState('listening'),
      onUserStoppedSpeaking: () => options.onState('thinking'),
      onBotStartedSpeaking: () => options.onState('speaking'),
      onBotStoppedSpeaking: () => options.onState('listening'),
      onUserTranscript: (data) => options.onUserTranscript(data.text, data.final),
      onBotLlmText: (data) => options.onAssistantDelta(data.text),
      onLocalAudioLevel: (level) => options.onAudioLevel?.('user', level),
      onRemoteAudioLevel: (level) => options.onAudioLevel?.('assistant', level),
      onServerMessage: (data) => {
        const event = data?.data ?? data;
        if (
          (event?.type === 'voomate-turn-started' || event?.type === 'voomate-turn-complete') &&
          typeof event.conversationId === 'string'
        ) {
          options.onConversationId(event.conversationId);
        }
      },
      onTrackStarted: (track, participant) => {
        if (track.kind !== 'audio') return;
        const source = participant?.local ? 'user' : 'assistant';
        startSpectrum(track, source);
        if (!participant?.local) {
          options.audioElement.srcObject = new MediaStream([track]);
          void options.audioElement.play().catch(() => undefined);
        }
      },
      onDisconnected: () => options.onState('ended'),
      onError: () => options.onError('Voice connection failed. You can continue by chat.'),
      onDeviceError: () => options.onError('Microphone access is unavailable. Chat still works.'),
    },
  });

  options.onState('connecting');
  await client.startBotAndConnect({
    endpoint: options.endpoint,
    timeout: 15_000,
    requestData: {
      transport: 'webrtc',
      createDailyRoom: false,
      enableDefaultIceServers: true,
      body: {
        sessionToken: options.sessionToken,
        conversationId: options.conversationId ?? null,
        pageUrl: options.pageUrl,
      },
    },
  });

  return {
    async disconnect() {
      options.audioElement.srcObject = null;
      for (const stop of spectrumStops.values()) stop();
      spectrumStops.clear();
      await client.disconnect();
    },
    setMuted(value: boolean) {
      muted = value;
      client.enableMic(!value);
    },
    get muted() {
      return muted;
    },
  };
}
