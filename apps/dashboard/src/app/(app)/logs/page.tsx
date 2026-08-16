'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { PageBody, PageHeader } from '@/components/shell/page-header';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/session';

type RunEvent = {
  id: string;
  run_id: string;
  stage: string;
  status: string;
  latency_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type RunGroup = {
  runId: string;
  events: RunEvent[];
  startedAt: string;
  state: 'complete' | 'attention' | 'running';
  latencyMs: number | null;
};

const stageNames: Record<string, string> = {
  message_received: 'Received the request',
  dialogue_policy: 'Handled the conversation state',
  orchestration_plan: 'Planned the response',
  platform_assistance_policy: 'Used a verified platform answer',
  knowledge_retrieval: 'Checked business knowledge',
  prompt_compaction: 'Prepared focused context',
  bedrock_inline_agent: 'Reasoned with the AI model',
  bedrock_agent_first_token: 'Started the response',
  tool_input_validation: 'Validated tool details',
  tool_permission_check: 'Checked tool permission',
  live_read_policy: 'Checked live-data permission',
  integration_live_read: 'Read current business data',
  tool_output_filter: 'Protected the tool result',
  human_handoff: 'Prepared a human handoff',
  customer_response_quality: 'Verified customer language',
  response_returned: 'Sent the answer',
  agent_runtime: 'Finished the request',
};

function words(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function sourceNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (typeof item !== 'object' || item === null || !('source' in item)) return [];
    return typeof item.source === 'string' ? [item.source] : [];
  });
}

function eventExplanation(event: RunEvent): string {
  const meta = event.metadata;
  if (event.stage === 'message_received') {
    return `Accepted a ${meta.channel === 'voice' ? 'voice' : 'chat'} request from the signed widget session.`;
  }
  if (event.stage === 'orchestration_plan') {
    const sources = sourceNames(meta.sources);
    const capabilities = list(meta.selectedCapabilities);
    if (capabilities.length) return `Selected ${capabilities.join(', ')} for current information.`;
    if (sources.length) return `Selected ${sources.join(', ')} as the grounded sources.`;
    return `Chose the ${String(meta.route ?? 'conversation')} path for this request.`;
  }
  if (event.stage === 'knowledge_retrieval') {
    const sourceCount = count(meta.sourceCount);
    if (meta.skipped)
      return `No knowledge lookup was needed: ${words(String(meta.skipped)).toLowerCase()}.`;
    return `Found ${sourceCount} relevant ${sourceCount === 1 ? 'source' : 'sources'} using ${words(String(meta.mode ?? 'retrieval')).toLowerCase()}.`;
  }
  if (event.stage === 'prompt_compaction') {
    return `Removed ${count(meta.savedTokens).toLocaleString()} unnecessary context tokens before reasoning.`;
  }
  if (event.stage === 'bedrock_inline_agent') {
    if (event.status === 'started')
      return 'Started a bounded reasoning turn with only approved capabilities.';
    return `Completed the model turn with ${count(meta.toolCalls)} ${count(meta.toolCalls) === 1 ? 'tool request' : 'tool requests'}.`;
  }
  if (event.stage === 'live_read_policy') {
    return event.status === 'success'
      ? `Allowed the ${String(meta.capability ?? 'requested')} read under the active policy.`
      : `Blocked the read because ${String(meta.reason ?? 'the policy did not allow it')}.`;
  }
  if (event.stage === 'integration_live_read') {
    return event.status === 'success'
      ? `Read current ${String(meta.capability ?? 'business')} data through the read-only connection.`
      : 'The live read did not complete, so its result was not used.';
  }
  if (event.stage === 'tool_input_validation') {
    return event.status === 'success'
      ? 'The requested tool inputs matched the approved schema.'
      : 'The tool was stopped before execution because required details were missing or invalid.';
  }
  if (event.stage === 'tool_permission_check') {
    return event.status === 'success'
      ? 'The tool was enabled for this tenant and agent.'
      : 'The tool was stopped because this agent did not have permission.';
  }
  if (event.stage === 'tool_output_filter') {
    return `Returned only ${list(meta.allowedFields).length} approved public fields.`;
  }
  if (event.stage === 'customer_response_quality') {
    const repairs = list(meta.guardInterventions);
    return repairs.length
      ? `Repaired ${repairs.map((repair) => words(repair).toLowerCase()).join(', ')} before the customer saw the answer.`
      : 'Confirmed that the reply was natural, customer-facing, and not an echo.';
  }
  if (event.stage === 'response_returned') return 'Delivered the verified answer to the customer.';
  if (event.stage === 'agent_runtime') {
    return `The complete request finished in ${(event.latency_ms ?? 0).toLocaleString()} ms.`;
  }
  if (event.stage === 'human_handoff') return 'Marked the conversation for a person to review.';
  return event.status === 'success'
    ? 'This runtime step completed successfully.'
    : 'This step needs attention before it can complete.';
}

function groupRuns(events: RunEvent[]): RunGroup[] {
  const groups = new Map<string, RunEvent[]>();
  for (const event of events) {
    const current = groups.get(event.run_id) ?? [];
    current.push(event);
    groups.set(event.run_id, current);
  }
  return [...groups.entries()]
    .map(([runId, runEvents]) => {
      const ordered = runEvents.sort(
        (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
      );
      const runtime = [...ordered].reverse().find((event) => event.stage === 'agent_runtime');
      const attention = ordered.some((event) => ['error', 'denied'].includes(event.status));
      return {
        runId,
        events: ordered,
        startedAt: ordered[0]?.created_at ?? new Date().toISOString(),
        state: attention ? 'attention' : runtime ? 'complete' : 'running',
        latencyMs: runtime?.latency_ms ?? null,
      } satisfies RunGroup;
    })
    .sort(
      (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
    );
}

export default function LogsPage() {
  const { organization } = useSession();
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    setError(undefined);
    const { data, error: queryError } = await createClient()
      .from('agent_run_events')
      .select('id,run_id,stage,status,latency_ms,metadata,created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(400);
    if (queryError) setError(queryError.message);
    else setEvents((data ?? []) as RunEvent[]);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 5_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const runs = useMemo(() => groupRuns(events), [events]);
  const completed = runs.filter((run) => run.state === 'complete').length;
  const successful = runs.filter((run) => run.state !== 'attention').length;
  const measuredLatencies = runs.flatMap((run) => (run.latencyMs === null ? [] : [run.latencyMs]));
  const averageLatency = measuredLatencies.length
    ? measuredLatencies.reduce((sum, value) => sum + value, 0) / measuredLatencies.length
    : 0;

  return (
    <>
      <PageHeader
        title="Agent activity"
        description="Every customer request, explained from arrival to verified answer."
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--surface-sunken)] px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />
      <PageBody>
        {error ? (
          <div className="rounded-lg bg-critical-soft p-4 text-sm text-critical dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <SummaryMetric
            label="Requests loaded"
            value={runs.length.toLocaleString()}
            icon={Activity}
          />
          <SummaryMetric label="Completed" value={completed.toLocaleString()} icon={Check} />
          <SummaryMetric
            label="Clear runs"
            value={runs.length ? `${((successful / runs.length) * 100).toFixed(1)}%` : '100%'}
            icon={ShieldCheck}
          />
          <SummaryMetric
            label="Average time"
            value={averageLatency ? `${(averageLatency / 1_000).toFixed(1)}s` : '—'}
            icon={Clock3}
          />
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Request timeline</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a request to see what the agent chose, checked, and completed.
            </p>
          </div>

          {runs.length === 0 && !loading ? (
            <div className="rounded-lg bg-[var(--surface-sunken)] p-12 text-center">
              <MessageSquare className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-4 font-medium">No Web Agent requests yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The first installed-widget request will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((run, runIndex) => (
                <details
                  className="group overflow-hidden rounded-lg bg-[var(--surface-soft)] p-2"
                  key={run.runId}
                  open={runIndex === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-4 rounded-lg bg-background px-4 py-4 transition-colors hover:bg-[var(--surface-sunken)]">
                    <RunState state={run.state} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Request at{' '}
                          {new Date(run.startedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {run.events.length} steps
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(run.startedAt).toLocaleDateString(undefined, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                        {run.latencyMs === null ? '' : ` · ${(run.latencyMs / 1_000).toFixed(1)}s`}
                      </p>
                    </div>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-500 group-open:rotate-180" />
                  </summary>

                  <div className="px-3 pb-3 pt-5 sm:px-5">
                    <ol className="space-y-2">
                      {run.events.map((event, eventIndex) => (
                        <li
                          className="grid grid-cols-[32px_1fr] gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-background"
                          key={event.id}
                        >
                          <span
                            className={`mt-0.5 flex size-8 items-center justify-center rounded-lg ${
                              ['error', 'denied'].includes(event.status)
                                ? 'bg-critical-soft text-critical dark:bg-red-950/40 dark:text-red-300'
                                : 'bg-background text-accent-600 dark:text-accent-300'
                            }`}
                          >
                            {['error', 'denied'].includes(event.status) ? (
                              <CircleAlert className="size-3.5" />
                            ) : eventIndex === run.events.length - 1 ? (
                              <Check className="size-3.5" />
                            ) : (
                              <span className="size-1.5 rounded-full bg-current" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {stageNames[event.stage] ?? words(event.stage)}
                              </p>
                              <span className="text-[11px] text-muted-foreground">
                                {event.latency_ms === null
                                  ? ''
                                  : `${event.latency_ms.toLocaleString()} ms`}
                              </span>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {eventExplanation(event)}
                            </p>
                            {Object.keys(event.metadata).length ? (
                              <details className="mt-2">
                                <summary className="w-fit cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                                  Technical details
                                </summary>
                                <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-ink-950 p-3 text-[11px] leading-5 text-ink-100">
                                  {JSON.stringify(event.metadata, null, 2)}
                                </pre>
                              </details>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </PageBody>
    </>
  );
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-lg bg-[var(--surface-soft)] p-4 sm:p-5">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-6 text-2xl font-semibold text-foreground sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function RunState({ state }: { state: RunGroup['state'] }) {
  const config = {
    complete: {
      label: 'Complete',
      className: 'bg-positive-soft text-positive dark:bg-emerald-950/40 dark:text-emerald-300',
      icon: Check,
    },
    attention: {
      label: 'Review',
      className: 'bg-critical-soft text-critical dark:bg-red-950/40 dark:text-red-300',
      icon: CircleAlert,
    },
    running: {
      label: 'Running',
      className: 'bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300',
      icon: BrainCircuit,
    },
  }[state];
  const Icon = config.icon;
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${config.className}`}
      title={config.label}
    >
      <Icon className="size-4" />
    </span>
  );
}
