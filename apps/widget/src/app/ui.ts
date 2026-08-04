/**
 * The conversation UI.
 *
 * Plain DOM, no framework: this document is downloaded by a visitor who wanted to ask one
 * question, and a framework would be most of its weight for a screen that is a list, a text box
 * and two buttons.
 *
 * Three things this file exists to get right, all of them things visitors complain about in
 * voice products rather than things that look wrong in a screenshot:
 *
 * 1. **The state is always visible.** Listening, thinking and speaking look different at a
 *    glance. Silence with no explanation is indistinguishable from a broken microphone, and a
 *    visitor who thinks it is broken talks over the answer or leaves.
 * 2. **Stopping is always one press away.** The stop control is a fixed part of the layout, not
 *    something that appears mid-answer where the send button used to be.
 * 3. **Typing always works.** Some visitors cannot speak, some are in an open-plan office, some
 *    have a microphone the browser refuses to open. The text box is never disabled and never
 *    hidden, including while the agent is talking.
 *
 * Every string a visitor sees is written here or comes from the server. Nothing is interpolated
 * as HTML — `textContent` throughout — because answers contain merchant content and transcripts
 * contain whatever the visitor said.
 */
import type { AgentPresentation } from './api.js';

export type ConversationStatus =
  'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'ended';

export type MicState = 'off' | 'starting' | 'on' | 'muted';

export interface ViewHandlers {
  onSend: (text: string) => void;
  onMicToggle: () => void;
  onMuteToggle: () => void;
  onStop: () => void;
}

const STATUS_LABEL: Record<ConversationStatus, string> = {
  idle: 'Ready',
  connecting: 'Connecting…',
  listening: 'Listening',
  thinking: 'Thinking…',
  speaking: 'Speaking',
  ended: 'Conversation ended',
};

const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export class ConversationView {
  private readonly transcript = element('div', 'transcript');
  private readonly statusDot = element('span', 'status-dot');
  private readonly statusText = element('span', 'status-text', STATUS_LABEL.idle);
  private readonly title = element('span', 'title', 'Assistant');
  private readonly banner = element('div', 'banner');
  private readonly input = element('input', 'input');
  private readonly sendButton = element('button', 'send');
  private readonly micButton = element('button', 'mic');
  private readonly muteButton = element('button', 'mute');
  private readonly stopButton = element('button', 'stop');
  private readonly meter = element('span', 'meter-fill');

  /** The visitor's in-progress speech. One bubble, rewritten, then made final. */
  private partial: HTMLElement | undefined;
  /** Agent bubbles being streamed into, by turn. */
  private readonly agentTurns = new Map<string, HTMLElement>();

  constructor(
    private readonly root: HTMLElement,
    private readonly handlers: ViewHandlers,
  ) {
    this.build();
  }

  setAgent(agent: AgentPresentation): void {
    this.title.textContent = agent.displayName;
    if (agent.appearance.accentColor !== undefined) {
      this.root.style.setProperty('--accent', agent.appearance.accentColor);
    }
    this.micButton.hidden = !agent.voiceEnabled;
    this.muteButton.hidden = true;
  }

  setStatus(status: ConversationStatus): void {
    this.statusText.textContent = STATUS_LABEL[status];
    this.root.dataset.status = status;
    // Only meaningful while the agent is producing sound; hiding it the rest of the time keeps
    // it from reading as a control the visitor failed to press.
    this.stopButton.hidden = status !== 'speaking' && status !== 'thinking';
  }

  setMicState(state: MicState): void {
    this.root.dataset.mic = state;
    this.micButton.setAttribute('aria-pressed', String(state !== 'off'));
    this.micButton.setAttribute(
      'aria-label',
      state === 'off' ? 'Start talking' : 'Stop using the microphone',
    );
    this.muteButton.hidden = state === 'off' || state === 'starting';
    this.muteButton.setAttribute('aria-pressed', String(state === 'muted'));
    this.muteButton.setAttribute('aria-label', state === 'muted' ? 'Unmute' : 'Mute');
    this.muteButton.textContent = state === 'muted' ? 'Unmute' : 'Mute';
    if (state !== 'on') this.setLevel(0);
  }

  /** Microphone level, 0..1. Called forty times a second, so it only writes one property. */
  setLevel(level: number): void {
    // A square-root curve. Speech spends most of its time well below full scale, and a linear
    // meter therefore barely moves — which reads as a microphone that is not picking anything up.
    this.meter.style.transform = `scaleX(${Math.min(1, Math.sqrt(level) * 1.4).toFixed(3)})`;
  }

  /** What the visitor is saying right now. A guess: it is styled as provisional and may change. */
  showPartial(text: string): void {
    if (text.length === 0) {
      this.partial?.remove();
      this.partial = undefined;
      return;
    }
    this.partial ??= this.addBubble('visitor partial', '');
    this.partial.textContent = text;
    this.scrollToEnd();
  }

  /** The transcript settled. The provisional bubble becomes the real one. */
  commitVisitor(text: string): void {
    if (this.partial !== undefined) {
      this.partial.className = 'bubble visitor';
      this.partial.textContent = text;
      this.partial = undefined;
    } else {
      this.addBubble('visitor', text);
    }
    this.scrollToEnd();
  }

  startAgentTurn(turnId: string): void {
    if (this.agentTurns.has(turnId)) return;
    this.agentTurns.set(turnId, this.addBubble('agent', ''));
    this.scrollToEnd();
  }

  appendAgent(turnId: string, text: string): void {
    this.startAgentTurn(turnId);
    const bubble = this.agentTurns.get(turnId)!;
    bubble.textContent = (bubble.textContent ?? '') + text;
    this.scrollToEnd();
  }

  finishAgentTurn(
    turnId: string,
    text: string,
    citations: readonly { title: string; url?: string }[] = [],
  ): void {
    this.startAgentTurn(turnId);
    const bubble = this.agentTurns.get(turnId)!;
    // The final text is authoritative. It differs from the accumulated deltas when the answer
    // was interrupted, and showing the full text under a sentence the visitor never heard is
    // the sort of thing that makes an agent look like it is not listening.
    bubble.textContent = text;

    if (citations.length > 0) {
      const list = element('div', 'citations');
      for (const citation of citations) {
        if (citation.url === undefined) {
          list.appendChild(element('span', 'citation', citation.title));
          continue;
        }
        const link = element('a', 'citation', citation.title);
        link.href = citation.url;
        link.target = '_blank';
        // The widget is embedded on someone else's site; `noopener` keeps the opened page from
        // reaching back into this frame.
        link.rel = 'noopener noreferrer';
        list.appendChild(link);
      }
      bubble.appendChild(list);
    }

    this.agentTurns.delete(turnId);
    this.scrollToEnd();
  }

  /** A system note in the flow: "Sorry, could you say that again?", "Microphone blocked". */
  addNote(text: string): void {
    this.transcript.appendChild(element('div', 'note', text));
    this.scrollToEnd();
  }

  showBanner(message: string): void {
    this.banner.textContent = message;
    this.banner.hidden = false;
  }

  clearBanner(): void {
    this.banner.hidden = true;
  }

  /** Voice is over — for good, or because the socket dropped. Typing must still work. */
  disableVoice(): void {
    this.micButton.hidden = true;
    this.muteButton.hidden = true;
    this.stopButton.hidden = true;
    this.setLevel(0);
  }

  private addBubble(className: string, text: string): HTMLElement {
    const bubble = element('div', `bubble ${className}`, text);
    this.transcript.appendChild(bubble);
    return bubble;
  }

  private scrollToEnd(): void {
    this.transcript.scrollTop = this.transcript.scrollHeight;
  }

  private build(): void {
    this.root.className = 'widget';
    this.root.dataset.status = 'idle';
    this.root.dataset.mic = 'off';

    const header = element('header', 'header');
    const status = element('span', 'status');
    status.append(this.statusDot, this.statusText);
    header.append(this.title, status);

    this.banner.hidden = true;
    this.banner.setAttribute('role', 'alert');

    // Screen readers announce additions rather than re-reading the conversation. `polite`
    // rather than `assertive`: an answer arriving should not interrupt what the visitor is
    // already being told.
    this.transcript.setAttribute('role', 'log');
    this.transcript.setAttribute('aria-live', 'polite');

    const meter = element('span', 'meter');
    meter.appendChild(this.meter);
    meter.setAttribute('aria-hidden', 'true');

    this.micButton.type = 'button';
    this.micButton.textContent = 'Talk';
    this.micButton.appendChild(meter);
    this.micButton.addEventListener('click', () => this.handlers.onMicToggle());

    this.muteButton.type = 'button';
    this.muteButton.textContent = 'Mute';
    this.muteButton.hidden = true;
    this.muteButton.addEventListener('click', () => this.handlers.onMuteToggle());

    this.stopButton.type = 'button';
    this.stopButton.textContent = 'Stop';
    this.stopButton.hidden = true;
    this.stopButton.setAttribute('aria-label', 'Stop the assistant talking');
    this.stopButton.addEventListener('click', () => this.handlers.onStop());

    this.input.type = 'text';
    this.input.placeholder = 'Type a message';
    this.input.autocomplete = 'off';
    this.input.setAttribute('aria-label', 'Type a message');
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.submit();
    });

    this.sendButton.type = 'button';
    this.sendButton.textContent = 'Send';
    this.sendButton.addEventListener('click', () => this.submit());

    const controls = element('div', 'controls');
    controls.append(this.micButton, this.muteButton, this.stopButton);

    const composer = element('div', 'composer');
    composer.append(this.input, this.sendButton);

    const footer = element('footer', 'footer');
    footer.append(controls, composer);

    this.root.replaceChildren(header, this.banner, this.transcript, footer);
  }

  private submit(): void {
    const text = this.input.value.trim();
    if (text.length === 0) return;
    this.input.value = '';
    this.handlers.onSend(text);
  }
}
