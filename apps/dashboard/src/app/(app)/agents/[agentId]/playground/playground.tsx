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
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CheckCircle2, CircleDashed, Radio, ShieldCheck } from 'lucide-react';
import { useAgent } from '@/components/agent/shell';
import { PageBody } from '@/components/shell/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { TextArea } from '@/components/ui/field';
import { askStream, type AskLatency, type Citation } from '@/lib/ask';
import { messageFor, useApiQuery } from '@/lib/hooks';
import { useApiAuth } from '@/lib/session';

interface Turn {
  role: 'visitor' | 'agent';
  content: string;
  citations?: Citation[];
  ungrounded?: boolean;
  latency?: AskLatency;
  failed?: boolean;
}

type SetupPreview = {
  sdk: {
    diagnostic: {
      previewEmbeddable: boolean;
      previewReason: string | null;
    } | null;
  };
};

const TEST_SCENARIOS = [
  {
    title: 'Core answer',
    prompt: 'What do you offer and who is it for?',
    detail: 'Checks whether the agent can introduce the business from approved knowledge.',
  },
  {
    title: 'Policy boundary',
    prompt: 'I need a refund right now. What can you do for me?',
    detail: 'Checks the response around a sensitive customer request.',
  },
  {
    title: 'Support handoff',
    prompt: 'I still need help. How can I reach a person?',
    detail: 'Checks that the agent gives a safe, useful next step when it cannot finish the job.',
  },
] as const;

export function Playground() {
  const { agent } = useAgent();
  const auth = useApiAuth();
  const setup = useApiQuery<{ setup: SetupPreview }>(`/v1/agents/${agent.id}/setup`);

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

  const send = async (nextQuestion?: string) => {
    const question = (nextQuestion ?? draft).trim();
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

  const completedRuns = turns.filter(
    (turn) => turn.role === 'agent' && turn.failed !== true && turn.latency !== undefined,
  );
  const groundedRuns = completedRuns.filter(
    (turn) => turn.ungrounded !== true && (turn.citations?.length ?? 0) > 0,
  );
  const checkedRuns = completedRuns.length;
  const groundingRate =
    checkedRuns === 0 ? undefined : Math.round((groundedRuns.length / checkedRuns) * 100);

  return (
    <PageBody>
      <Panel>
        <PanelHeader
          title="Live workflow test"
          description="Run customer requests against this agent’s authenticated runtime. Inspect the evidence, safety boundaries, and speed before you send real visitors here."
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
          <div className="grid min-h-[34rem] lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex min-w-0 flex-col">
              <div className="border-b border-[var(--border-default)] px-6 py-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-live="polite">
                  <RuntimeState
                    streaming={streaming}
                    checkedRuns={checkedRuns}
                    groundingRate={groundingRate}
                  />
                  <span className="text-[12px] text-muted-foreground">
                    {channel === 'voice'
                      ? 'Voice answer rules enabled'
                      : 'Web chat answer rules enabled'}
                  </span>
                </div>
              </div>

              <div className="max-h-[52vh] min-h-64 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {turns.length === 0 ? (
                  <EmptyTestState onRun={(prompt) => void send(prompt)} disabled={streaming} />
                ) : (
                  turns.map((turn, index) => (
                    <TurnBubble
                      key={index}
                      turn={turn}
                      thinking={
                        streaming && index === turns.length - 1 && turn.content.length === 0
                      }
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

                <label htmlFor="workflow-test-question" className="sr-only">
                  Customer question to test
                </label>
                <div className="flex items-end gap-2">
                  <TextArea
                    id="workflow-test-question"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ask a real customer question…"
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
                      Run test
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-[11.5px] text-muted-foreground">
                  Enter to run · Shift + Enter for a new line
                </p>
              </div>
            </div>

            <aside
              className="border-t border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-5 lg:border-l lg:border-t-0"
              aria-label="Workflow test guide"
            >
              <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
                <ShieldCheck className="size-4 text-accent-600" strokeWidth={1.8} />
                What this checks
              </div>
              <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
                Each result is generated by the same agent runtime used for your workspace—not a
                demo response.
              </p>

              <div className="mt-5 space-y-2">
                {TEST_SCENARIOS.map((scenario, index) => (
                  <button
                    key={scenario.title}
                    type="button"
                    disabled={streaming}
                    onClick={() => void send(scenario.prompt)}
                    className="group w-full rounded-lg border border-transparent p-3 text-left transition-[background-color,border-color,transform] duration-200 hover:border-[var(--border-default)] hover:bg-[var(--surface-panel)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-[12.5px] font-semibold text-foreground">
                        {scenario.title}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        0{index + 1}
                      </span>
                    </span>
                    <span className="mt-1 block text-[11.5px] leading-4 text-muted-foreground">
                      {scenario.detail}
                    </span>
                  </button>
                ))}
              </div>

              <Link
                href={`/agents/${agent.id}/knowledge`}
                className="mt-5 inline-flex min-h-9 items-center gap-1.5 text-[12px] font-semibold text-accent-700 transition-colors hover:text-accent-600 dark:text-accent-300"
              >
                Improve source evidence <ArrowUpRight className="size-3.5" />
              </Link>
            </aside>
          </div>
        </PanelBody>
      </Panel>
      {agent.websiteUrl && (
        <Panel className="mt-4">
          <PanelHeader
            title="Your live site"
            description={
              setup.data?.setup.sdk.diagnostic?.previewEmbeddable
                ? 'This is your actual site. If the Web SDK is installed and the agent is on, use the widget here exactly as a visitor would.'
                : 'Your site security policy blocks an embedded preview. Open it in a new tab to test the real visitor experience.'
            }
            action={
              <a
                href={agent.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--surface-sunken)] px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-[var(--surface-hover)]"
              >
                Open site <ArrowUpRight className="size-3.5" />
              </a>
            }
          />
          {setup.data?.setup.sdk.diagnostic?.previewEmbeddable ? (
            <div className="h-[34rem] overflow-hidden border-t border-[var(--border-default)] bg-white">
              <iframe
                title="Live website preview"
                src={agent.websiteUrl}
                className="size-full border-0"
                sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
              />
            </div>
          ) : (
            <PanelBody>
              <Callout tone="caution" title="Preview unavailable">
                {setup.data?.setup.sdk.diagnostic?.previewReason ??
                  'Run Check installation on the Info tab first. If your site disallows embedded previews, the Open site button is the real test path.'}
              </Callout>
            </PanelBody>
          )}
        </Panel>
      )}
    </PageBody>
  );
}

function RuntimeState({
  streaming,
  checkedRuns,
  groundingRate,
}: {
  streaming: boolean;
  checkedRuns: number;
  groundingRate: number | undefined;
}) {
  if (streaming) {
    return (
      <Badge tone="accent">
        <Radio className="size-3 animate-pulse" strokeWidth={2} /> Testing live runtime
      </Badge>
    );
  }

  if (checkedRuns === 0) {
    return (
      <Badge tone="neutral">
        <CircleDashed className="size-3" strokeWidth={2} /> Ready to test
      </Badge>
    );
  }

  return (
    <Badge tone={groundingRate === 100 ? 'positive' : 'caution'}>
      <CheckCircle2 className="size-3" strokeWidth={2} />
      {groundingRate}% grounded · {checkedRuns} {checkedRuns === 1 ? 'run' : 'runs'}
    </Badge>
  );
}

function EmptyTestState({
  onRun,
  disabled,
}: {
  onRun: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="py-5 sm:py-7">
      <p className="text-[13px] font-medium text-foreground">Start with a customer moment.</p>
      <p className="mt-1 max-w-md text-[12.5px] leading-5 text-muted-foreground">
        Test what a visitor would actually ask, then use the evidence under each answer to decide
        what needs work.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {TEST_SCENARIOS.map((scenario) => (
          <button
            key={scenario.title}
            type="button"
            disabled={disabled}
            onClick={() => onRun(scenario.prompt)}
            className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-[12px] font-medium text-secondary transition-[background-color,color,transform] duration-200 hover:bg-[var(--surface-hover)] hover:text-foreground active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
          >
            {scenario.title}
          </button>
        ))}
      </div>
    </div>
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
