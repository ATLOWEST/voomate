'use client';

/**
 * The playground.
 *
 * The screen that has to be good before voice is built. A merchant cannot tell a thin
 * knowledge base from a broken one without watching the agent answer, and cannot judge whether
 * an agent is safe to publish without seeing where each answer came from.
 *
 * Three things are shown that a normal chat UI hides:
 *
 *  - **Citations.** Which stored content the answer was built from, with its match score. An
 *    answer with one weak citation is a different thing from an answer with three strong ones,
 *    and only one of them is worth publishing.
 *  - **A "no sources" warning.** Retrieval finding nothing means the corpus is thin. That is a
 *    content problem the merchant can fix, and it is invisible if the agent just apologises.
 *  - **Latency.** The 1.2 second speech-to-speech budget is the constraint the product is
 *    designed around. Watching it here, in Phase 2, is how a slow retrieval gets caught months
 *    before a visitor hears it as a pause.
 */
import { useEffect, useRef, useState } from 'react';
import { useAgent } from '@/components/agent/shell';
import { PageBody } from '@/components/shell/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { TextArea } from '@/components/ui/field';
import { askStream, type AskLatency, type Citation } from '@/lib/ask';
import { messageFor } from '@/lib/hooks';
import { useApiAuth } from '@/lib/session';

interface Turn {
  role: 'visitor' | 'agent';
  content: string;
  citations?: Citation[];
  ungrounded?: boolean;
  latency?: AskLatency;
  failed?: boolean;
}

export function Playground() {
  const { agent } = useAgent();
  const auth = useApiAuth();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [channel, setChannel] = useState<'text' | 'voice'>('text');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string>();

  const abortRef = useRef<AbortController>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  // Leaving the page mid-answer must stop generation. Otherwise Bedrock keeps streaming tokens
  // into a dead socket and we pay for every one of them.
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async () => {
    const question = draft.trim();
    if (question.length === 0 || streaming) return;

    // Captured before the state update: the model must not be told about the question it is
    // currently being asked, or it sees it twice.
    const history = turns
      .filter((turn) => !turn.failed)
      .map((turn) => ({ role: turn.role, content: turn.content }));

    setDraft('');
    setError(undefined);
    setStreaming(true);
    setTurns((current) => [
      ...current,
      { role: 'visitor', content: question },
      { role: 'agent', content: '' },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await askStream(agent.id, { question, history, channel }, await auth(), {
        signal: controller.signal,
        onDelta: (text) => {
          setTurns((current) => appendToLast(current, text));
        },
      });

      setTurns((current) =>
        replaceLast(current, {
          role: 'agent',
          // The streamed text carries `[S1]` citation markers; the final payload has them
          // stripped and resolved. Using the final text is what makes the markers disappear.
          content: result.answer,
          citations: result.citations,
          ungrounded: result.ungrounded,
          latency: result.latency,
        }),
      );
    } catch (caught) {
      if (controller.signal.aborted) {
        // A deliberate stop keeps whatever arrived; it is not an error.
        setTurns((current) => dropEmptyLast(current));
      } else {
        setError(messageFor(caught));
        setTurns((current) =>
          replaceLast(current, {
            role: 'agent',
            content: 'This answer failed. See the message below.',
            failed: true,
          }),
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <PageBody>
      <Panel>
        <PanelHeader
          title="Playground"
          description="Ask what your visitors will ask. Every answer shows the content it came from, so you can tell a good answer from a lucky one."
          action={
            <div className="flex items-center gap-2">
              <ChannelToggle value={channel} onChange={setChannel} disabled={streaming} />
              {turns.length > 0 && (
                <Button size="sm" onClick={() => setTurns([])} disabled={streaming}>
                  Clear
                </Button>
              )}
            </div>
          }
        />

        <PanelBody className="p-0">
          <div className="max-h-[52vh] min-h-64 space-y-5 overflow-y-auto px-6 py-5">
            {turns.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[13px] text-muted">
                  Nothing asked yet. Try a question a customer would actually type.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {['What do you sell?', 'How do refunds work?', 'How do I contact support?'].map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setDraft(suggestion)}
                        className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-[12.5px] text-secondary transition-colors hover:bg-[var(--surface-hover)]"
                      >
                        {suggestion}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ) : (
              turns.map((turn, index) => (
                <TurnBubble
                  key={index}
                  turn={turn}
                  thinking={streaming && index === turns.length - 1 && turn.content.length === 0}
                />
              ))
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-[var(--border-default)] px-6 py-4">
            {error !== undefined && (
              <div className="mb-3">
                <Callout tone="critical" title="The agent could not answer">
                  {error}
                </Callout>
              </div>
            )}

            <div className="flex items-end gap-2">
              <TextArea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask a question…"
                className="min-h-11"
                rows={1}
                onKeyDown={(event) => {
                  // Enter sends, Shift+Enter breaks the line. Chat convention, and the reason
                  // a merchant never has to reach for the mouse between questions.
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              {streaming ? (
                <Button onClick={() => abortRef.current?.abort()}>Stop</Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={draft.trim().length === 0}
                  onClick={() => void send()}
                >
                  Ask
                </Button>
              )}
            </div>
          </div>
        </PanelBody>
      </Panel>
    </PageBody>
  );
}

function ChannelToggle({
  value,
  onChange,
  disabled,
}: {
  value: 'text' | 'voice';
  onChange: (next: 'text' | 'voice') => void;
  disabled: boolean;
}) {
  return (
    <div
      className="flex rounded-lg p-0.5"
      style={{ backgroundColor: 'var(--surface-sunken)' }}
      role="group"
      aria-label="Answer style"
    >
      {(['text', 'voice'] as const).map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          title={
            option === 'voice'
              ? 'Spoken-answer rules: no formatting, shorter sentences. Worth checking separately — the two differ more than you would expect.'
              : 'Written answer, as the chat widget shows it.'
          }
          className={
            value === option
              ? 'rounded-md bg-[var(--surface-panel)] px-2.5 py-1 text-[12px] font-medium shadow-sm'
              : 'rounded-md px-2.5 py-1 text-[12px] font-medium text-secondary'
          }
        >
          {option === 'text' ? 'Text' : 'Voice'}
        </button>
      ))}
    </div>
  );
}

function TurnBubble({ turn, thinking }: { turn: Turn; thinking: boolean }) {
  if (turn.role === 'visitor') {
    return (
      <div className="flex justify-end">
        <div className="bg-accent-600 max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap text-white">
          {turn.content}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[85%]">
      <div
        className="rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap"
        style={{ backgroundColor: 'var(--surface-sunken)' }}
      >
        {thinking ? <Thinking /> : turn.content}
      </div>

      {turn.ungrounded === true && (
        <p className="text-caution mt-2 text-[12px] leading-relaxed">
          Nothing in this agent&apos;s knowledge matched the question. It will not invent an answer
          — add content on the Knowledge tab to close this gap.
        </p>
      )}

      {turn.citations !== undefined && turn.citations.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11.5px] text-muted">From:</span>
          {turn.citations.map((citation) => (
            <span
              key={citation.documentId}
              className="inline-flex max-w-64 items-center gap-1.5 rounded-md border border-[var(--border-default)] px-2 py-0.5 text-[11.5px]"
              title={`Match score ${citation.score.toFixed(2)}${citation.url !== undefined ? ` · ${citation.url}` : ''}`}
            >
              <span className="truncate">{citation.title}</span>
              <span className="tabular-nums text-muted">{citation.score.toFixed(2)}</span>
            </span>
          ))}
        </div>
      )}

      {turn.latency !== undefined && <LatencyStrip latency={turn.latency} />}
    </div>
  );
}

/**
 * The latency breakdown.
 *
 * Total is what a visitor feels; the split is what tells you which piece to fix. Time to first
 * token is the one that matters most once speech is attached — a visitor forgives a long
 * answer, not a long silence before it starts.
 */
function LatencyStrip({ latency }: { latency: AskLatency }) {
  const slow = latency.firstTokenMs > 1200;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
      <Badge tone={slow ? 'caution' : 'neutral'}>{latency.firstTokenMs} ms to first word</Badge>
      <span className="tabular-nums">
        search {latency.embeddingMs + latency.retrievalMs} ms · total {latency.totalMs} ms
      </span>
    </div>
  );
}

function Thinking() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Thinking">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="size-1.5 animate-pulse rounded-full bg-[var(--text-muted)]"
          style={{ animationDelay: `${String(dot * 150)}ms` }}
        />
      ))}
    </span>
  );
}

const appendToLast = (turns: Turn[], text: string): Turn[] => {
  const last = turns[turns.length - 1];
  if (last === undefined) return turns;
  return [...turns.slice(0, -1), { ...last, content: last.content + text }];
};

const replaceLast = (turns: Turn[], turn: Turn): Turn[] => [...turns.slice(0, -1), turn];

/** After a stop, an agent turn that never received a token is noise. Drop it. */
const dropEmptyLast = (turns: Turn[]): Turn[] => {
  const last = turns[turns.length - 1];
  return last !== undefined && last.role === 'agent' && last.content.length === 0
    ? turns.slice(0, -1)
    : turns;
};
