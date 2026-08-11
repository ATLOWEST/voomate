/**
 * The conversation: everything wired together.
 *
 * Microphone → socket → server, and server → speaker plus screen. The individual pieces are
 * each dull on purpose; this is where the sequencing lives, and sequencing is where voice
 * products go wrong.
 *
 * Two decisions worth stating outright.
 *
 * **Nothing connects until the visitor acts inside this frame.** Not when the widget opens —
 * when they press Talk or send a message. A voice session costs money per minute from the
 * moment it opens, and a visitor who opened the bubble to see what it was has not asked for
 * one. It is also the only thing that makes audio work at all: browsers refuse to play sound
 * without a gesture, and they refuse silently — the greeting would simply never be heard.
 *
 * **The server owns turn-taking; this file owns nothing.** It plays what arrives, stops when
 * told to stop, and reports what the visitor did. Deciding locally whether an interruption was
 * real would mean two systems making the same judgement from different information, and they
 * would disagree in front of the visitor.
 */
import type { ServerToClientMessage } from '@voomate/core/voice-protocol';
import { createSession, voiceSocketUrl, type AgentPresentation } from './api.js';
import { VoiceConnection } from './voice/connection.js';
import { CaptureError, MicrophoneCapture } from './voice/capture.js';
import { VoicePlayback } from './voice/playback.js';
import { ConversationView, type ConversationStatus } from './ui.js';

export interface ConversationContext {
  embedKey: string;
  pageUrl?: string;
  language?: string;
}

export interface ConversationEvents {
  onStarted?: (conversationId: string, channel: 'voice' | 'text') => void;
  onEnded?: (conversationId: string) => void;
  onMicDenied?: () => void;
  onError?: (code: string, message: string) => void;
}

export class Conversation {
  private readonly view: ConversationView;
  private readonly playback: VoicePlayback;
  private readonly capture: MicrophoneCapture;

  private connection: VoiceConnection | undefined;
  private agent: AgentPresentation | undefined;
  private conversationId: string | undefined;
  private sessionToken: string | undefined;

  private micOn = false;
  private muted = false;
  private thinking = false;
  private connecting = false;
  private ended = false;

  constructor(
    root: HTMLElement,
    private readonly context: ConversationContext,
    private readonly events: ConversationEvents = {},
  ) {
    this.view = new ConversationView(root, {
      onSend: (text) => void this.send(text),
      onMicToggle: () => void this.toggleMic(),
      onMuteToggle: () => this.toggleMute(),
      onStop: () => this.stopSpeaking(),
    });

    this.playback = new VoicePlayback({ onIdle: () => this.refreshStatus() });
    this.capture = new MicrophoneCapture({
      onFrame: (frame) => this.connection?.sendAudio(frame),
      onLevel: (level) => this.view.setLevel(level),
    });
  }

  /**
   * Fetch the agent's public presentation and render it.
   *
   * Runs on load, before the visitor has done anything. It costs one cheap request and buys the
   * greeting on screen immediately, which is what makes the widget feel like it is already
   * there rather than something that starts up when spoken to.
   */
  async load(): Promise<void> {
    this.view.setStatus('connecting');
    try {
      const { agent, session } = await createSession(this.context.embedKey, 'voice');
      this.agent = agent;
      this.sessionToken = session.token;
      this.view.setAgent(agent);

      if (agent.greeting !== undefined && agent.greeting.length > 0) {
        this.view.finishAgentTurn('greeting', agent.greeting);
      }

      if (!agent.voiceEnabled) {
        // Text-only agents have no transport yet — the socket is a voice socket. Saying so is
        // better than a send button that does nothing.
        this.view.disableVoice();
        this.view.showBanner('This assistant is not set up for voice on this page.');
      }

      this.view.setStatus('idle');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The assistant is unavailable.';
      this.view.showBanner(message);
      this.view.setStatus('idle');
      this.events.onError?.('session_failed', message);
    }
  }

  /** Leaving the page, or the host closed the widget. */
  async stop(): Promise<void> {
    this.connection?.close();
    this.connection = undefined;
    await this.capture.stop();
    await this.playback.close();
    this.micOn = false;
  }

  setPageUrl(pageUrl: string): void {
    this.context.pageUrl = pageUrl;
  }

  // --- The visitor's controls --------------------------------------------------------------

  private async toggleMic(): Promise<void> {
    if (this.micOn) {
      this.micOn = false;
      this.view.setMicState('off');
      await this.capture.stop();
      this.refreshStatus();
      return;
    }

    this.view.setMicState('starting');
    try {
      // Both of these must happen inside the click. The audio context and the microphone
      // permission are each granted against the gesture, and an `await` before them spends it.
      await this.playback.resume();
      const started = await this.capture.start();

      this.micOn = true;
      this.muted = false;
      this.view.setMicState('on');
      this.view.clearBanner();

      await this.connect({ echoCancellationUnavailable: started.echoCancellationUnavailable });
    } catch (error) {
      this.view.setMicState('off');
      this.handleCaptureError(error);
    }

    this.refreshStatus();
  }

  private toggleMute(): void {
    if (!this.micOn) return;
    this.muted = !this.muted;
    this.capture.setMuted(this.muted);
    this.connection?.send({ type: 'mute', muted: this.muted });
    this.view.setMicState(this.muted ? 'muted' : 'on');
  }

  /**
   * The stop button.
   *
   * Local playback is cancelled immediately rather than waiting for the server to agree.
   * Pressing stop and continuing to hear the agent for another second is the single most
   * damning thing a voice widget can do — the round trip is only tens of milliseconds, but the
   * visitor is listening for the silence, and they notice.
   */
  private stopSpeaking(): void {
    this.playback.cancel();
    this.connection?.send({ type: 'interrupt' });
    this.thinking = false;
    this.refreshStatus();
  }

  private async send(text: string): Promise<void> {
    this.view.commitVisitor(text);

    // Typing is also a gesture, so a visitor who never touches the microphone still gets audio.
    await this.playback.resume();
    if (!(await this.connect())) return;

    this.thinking = true;
    this.refreshStatus();
    this.connection?.send({ type: 'text', content: text });
  }

  // --- The socket ---------------------------------------------------------------------------

  /** Open the socket if it is not already open. Returns false when it cannot be opened. */
  private async connect(options: { echoCancellationUnavailable?: boolean } = {}): Promise<boolean> {
    if (this.connection?.isOpen === true) return true;
    if (this.connecting) return true;
    if (this.sessionToken === undefined || this.agent?.voiceEnabled !== true) {
      this.view.showBanner('This assistant is not available right now.');
      return false;
    }

    this.connecting = true;
    this.ended = false;
    this.view.setStatus('connecting');

    const connection = new VoiceConnection(voiceSocketUrl(), this.sessionToken, {
      onMessage: (message) => this.handleMessage(message),
      onAudio: (pcm) => {
        this.playback.enqueue(pcm);
        this.refreshStatus();
      },
      onClose: (clean) => this.handleClose(clean),
    });

    this.connection = connection;
    connection.connect({
      ...(this.context.language !== undefined ? { language: this.context.language } : {}),
      ...(this.context.pageUrl !== undefined ? { pageUrl: this.context.pageUrl } : {}),
      ...(options.echoCancellationUnavailable === true
        ? { echoCancellationUnavailable: true }
        : {}),
    });

    return true;
  }

  private handleMessage(message: ServerToClientMessage): void {
    switch (message.type) {
      case 'ready':
        this.connecting = false;
        this.conversationId = message.conversationId;
        this.view.clearBanner();
        if (message.voice.degraded) {
          // Worth saying once. The visitor is about to hear a voice that is not the one the
          // merchant chose, and silence about it reads as a bug in the product.
          this.view.addNote('Using a backup voice for this conversation.');
        }
        this.events.onStarted?.(message.conversationId, 'voice');
        break;

      case 'transcript':
        // Partials are for the screen only. Acting on one means answering a question the
        // visitor had not finished asking.
        if (message.final) this.view.commitVisitor(message.text);
        else this.view.showPartial(message.text);
        break;

      case 'turn-start':
        this.thinking = true;
        this.view.startAgentTurn(message.turnId);
        break;

      case 'answer-delta':
        this.view.appendAgent(message.turnId, message.text);
        break;

      case 'turn-end':
        this.thinking = false;
        this.view.finishAgentTurn(message.turnId, message.text, message.citations ?? []);
        break;

      case 'cancel':
        // The server decided the visitor is talking. Drop what is buffered — without this the
        // agent keeps talking for as long as the playback queue is deep.
        this.playback.cancel();
        this.thinking = false;
        break;

      case 'duck':
        this.playback.duck();
        break;

      case 'unduck':
        this.playback.unduck();
        break;

      case 'repeat-request':
        this.view.addNote(message.text);
        break;

      case 'error':
        this.view.showBanner(message.message);
        this.events.onError?.(message.code, message.message);
        if (message.fatal) this.finish('error');
        break;

      case 'ended':
        this.finish(message.reason);
        break;

      case 'speech-started':
      case 'speech-stopped':
        // The indicator is driven by the microphone level, which is already live and does not
        // wait for a round trip.
        break;

      default:
        break;
    }

    this.refreshStatus();
  }

  private handleClose(clean: boolean): void {
    this.connection = undefined;
    this.connecting = false;
    this.thinking = false;

    if (!clean && !this.ended) {
      // Deliberately not reconnecting automatically. A dropped voice session cannot be resumed
      // mid-sentence, and silently reopening one bills the merchant for a conversation the
      // visitor may have walked away from. Pressing Talk again starts a fresh one.
      this.view.showBanner('The connection dropped. Press Talk to start again.');
    }

    if (this.micOn) {
      this.micOn = false;
      this.muted = false;
      this.view.setMicState('off');
      void this.capture.stop();
    }

    this.refreshStatus();
  }

  private finish(reason: string): void {
    this.ended = true;
    this.thinking = false;
    this.playback.cancel();
    if (this.conversationId !== undefined) this.events.onEnded?.(this.conversationId);
    if (reason !== 'client-ended') this.view.setStatus('ended');
  }

  // --- Presentation -------------------------------------------------------------------------

  /** One place decides what the visitor is told is happening. */
  private refreshStatus(): void {
    this.view.setStatus(this.currentStatus());
  }

  private currentStatus(): ConversationStatus {
    if (this.ended) return 'ended';
    if (this.connecting) return 'connecting';
    // Speaking outranks thinking: the next answer can start generating while the previous one
    // is still playing, and "Thinking" over audible speech is simply wrong.
    if (this.playback.isPlaying) return 'speaking';
    if (this.thinking) return 'thinking';
    if (this.micOn && !this.muted) return 'listening';
    return 'idle';
  }

  private handleCaptureError(error: unknown): void {
    if (!(error instanceof CaptureError)) {
      this.view.showBanner('The microphone could not be started. You can still type.');
      return;
    }

    this.view.showBanner(`${error.message} You can still type your question.`);

    if (error.reason === 'denied') {
      // The host page is told, because browsers render permission prompts confusingly for
      // cross-origin iframes and the merchant may want to explain it in their own words.
      this.events.onMicDenied?.();
    }
  }
}
