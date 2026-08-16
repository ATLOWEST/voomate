'use client';

import type { UsageMeterBreakdown } from '@voomate/core';
import {
  Activity,
  Bot,
  BrainCircuit,
  CircleDollarSign,
  Database,
  Gauge,
  MessageSquare,
  PlugZap,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { PageBody, PageHeader } from '@/components/shell/page-header';
import { useApiQuery } from '@/lib/hooks';
import { useSession } from '@/lib/session';

interface AgentUsage {
  agentId: string | null;
  agentName: string;
  agentRuns: number;
  messages: number;
  toolCalls: number;
  liveReadCalls: number;
  estimatedProviderCostUsd: number;
}

interface UsageSummary {
  periodStart: string;
  textMessages: number;
  voiceMinutes: number;
  agentRuns: number;
  modelInvocations: number;
  knowledgeQueries: number;
  liveReadCalls: number;
  toolCalls: number;
  toolFailures: number;
  responseGuardInterventions: number;
  estimatedProviderCostUsd: number;
  meters: UsageMeterBreakdown[];
  byAgent: AgentUsage[];
  pricing: {
    version: string;
    currency: 'USD';
    basis: string;
    source: string;
  };
}

const number = new Intl.NumberFormat();
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 0.01 ? 4 : 2,
    maximumFractionDigits: value < 0.01 ? 4 : 2,
  }).format(value);
}

function meterQuantity(meter: UsageMeterBreakdown): string {
  if (meter.unit === 'bytes') return `${(meter.quantity / 1_048_576).toFixed(2)} MB`;
  if (meter.unit === 'minutes') return meter.quantity.toFixed(1);
  return number.format(Math.round(meter.quantity));
}

function billingLabel(meter: UsageMeterBreakdown): string {
  if (meter.billingMode === 'included') return 'Included';
  if (meter.billingMode === 'provider-estimate') return formatUsd(meter.estimatedProviderCostUsd);
  return 'Measured only';
}

const workflow = [
  { label: 'Request', detail: 'One signed customer turn', icon: MessageSquare },
  { label: 'Plan', detail: 'Choose only needed sources', icon: BrainCircuit },
  { label: 'Ground', detail: 'Knowledge or live data', icon: Database },
  { label: 'Act', detail: 'Permissioned tools only', icon: Wrench },
  { label: 'Verify', detail: 'Check and return safely', icon: ShieldCheck },
];

export default function UsagePage() {
  const { organization } = useSession();
  const { data, error, loading } = useApiQuery<UsageSummary>(
    organization === undefined ? null : '/v1/usage/summary',
    { pollMs: 15_000 },
  );

  const activeMeters =
    data?.meters.filter(
      (meter) =>
        meter.quantity > 0 ||
        ['agent_runs', 'llm_input_tokens', 'llm_output_tokens', 'tool_calls'].includes(meter.kind),
    ) ?? [];
  const reliability =
    data && data.toolCalls > 0
      ? Math.max(0, 100 - (data.toolFailures / data.toolCalls) * 100)
      : 100;

  return (
    <>
      <PageHeader
        title="Usage and cost"
        description="A live, tenant-scoped account of what each agent used this month."
        action={
          <span className="inline-flex items-center gap-2 rounded-lg bg-positive-soft px-3 py-2 text-xs font-semibold text-positive dark:bg-emerald-950/40 dark:text-emerald-300">
            <Activity className="size-3.5" /> Metering live
          </span>
        }
      />
      <PageBody>
        {error ? (
          <div className="rounded-lg bg-critical-soft p-4 text-sm text-critical dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-2 lg:grid-cols-12">
          <div className="agent-operations-enter flex min-h-52 flex-col justify-between rounded-lg bg-ink-950 p-6 text-white lg:col-span-8 dark:bg-ink-100 dark:text-ink-950">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-ink-400 dark:text-ink-600">
                Estimated AI processing
              </span>
              <CircleDollarSign className="size-5 text-accent-400" />
            </div>
            <div>
              <p className="text-5xl font-semibold leading-none sm:text-6xl">
                {loading ? '...' : formatUsd(data?.estimatedProviderCostUsd ?? 0)}
              </p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-ink-400 dark:text-ink-600">
                Based on measured model and embedding tokens. Included plan usage and any future
                overages stay separate from this provider estimate.
              </p>
            </div>
          </div>

          <div className="agent-operations-enter flex min-h-52 flex-col justify-between rounded-lg bg-accent-50 p-6 lg:col-span-4 dark:bg-accent-950/35">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-accent-800 dark:text-accent-200">
                Tool reliability
              </span>
              <Gauge className="size-5 text-accent-600 dark:text-accent-300" />
            </div>
            <div>
              <p className="text-5xl font-semibold text-foreground">{reliability.toFixed(1)}%</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {number.format(data?.toolCalls ?? 0)} requests,{' '}
                {number.format(data?.toolFailures ?? 0)} denied or failed.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Metric icon={Bot} label="Agent requests" value={compact.format(data?.agentRuns ?? 0)} />
          <Metric
            icon={BrainCircuit}
            label="Model calls"
            value={compact.format(data?.modelInvocations ?? 0)}
          />
          <Metric
            icon={PlugZap}
            label="Live reads"
            value={compact.format(data?.liveReadCalls ?? 0)}
          />
          <Metric
            icon={ShieldCheck}
            label="Reply repairs"
            value={compact.format(data?.responseGuardInterventions ?? 0)}
          />
        </section>

        <section className="mt-10">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Every measured unit</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Counts are exact runtime events. Dollar values are provider estimates, not invoices.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Since {data ? new Date(data.periodStart).toLocaleDateString() : 'this month'}
            </p>
          </div>
          <div className="overflow-hidden rounded-lg bg-[var(--surface-soft)] p-2">
            <div className="hidden grid-cols-[1.25fr_110px_130px_120px] gap-4 px-4 py-3 text-[11px] font-semibold text-muted-foreground md:grid">
              <span>Meter</span>
              <span className="text-right">Used</span>
              <span>Unit</span>
              <span className="text-right">Cost status</span>
            </div>
            <div className="space-y-1">
              {activeMeters.map((meter) => (
                <div
                  key={meter.kind}
                  className="grid gap-2 rounded-lg bg-background px-4 py-4 transition-colors duration-300 hover:bg-[var(--surface-sunken)] md:grid-cols-[1.25fr_110px_130px_120px] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{meter.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {meter.description}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold text-foreground md:text-right md:text-base">
                    {meterQuantity(meter)}
                  </p>
                  <p className="text-xs text-muted-foreground">{meter.unit}</p>
                  <p
                    className={`text-xs font-semibold md:text-right ${
                      meter.billingMode === 'provider-estimate'
                        ? 'text-accent-700 dark:text-accent-300'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {billingLabel(meter)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Usage by agent</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The same meter contract works for every released agent type.
            </p>
          </div>
          {data?.byAgent.length ? (
            <div className="overflow-hidden rounded-lg bg-[var(--surface-soft)] p-2">
              <div className="hidden grid-cols-[1fr_repeat(4,110px)] gap-4 px-4 py-3 text-[11px] font-semibold text-muted-foreground md:grid">
                <span>Agent</span>
                <span className="text-right">Requests</span>
                <span className="text-right">Tools</span>
                <span className="text-right">Live reads</span>
                <span className="text-right">AI estimate</span>
              </div>
              <div className="space-y-1">
                {data.byAgent.map((agent) => (
                  <div
                    key={agent.agentId ?? 'workspace'}
                    className="grid gap-3 rounded-lg bg-background px-4 py-4 md:grid-cols-[1fr_repeat(4,110px)] md:items-center md:gap-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300">
                        <Bot className="size-4" />
                      </span>
                      <span className="truncate text-sm font-semibold">{agent.agentName}</span>
                    </div>
                    <AgentValue label="Requests" value={number.format(agent.agentRuns)} />
                    <AgentValue label="Tools" value={number.format(agent.toolCalls)} />
                    <AgentValue label="Live reads" value={number.format(agent.liveReadCalls)} />
                    <AgentValue
                      label="AI estimate"
                      value={formatUsd(agent.estimatedProviderCostUsd)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-[var(--surface-sunken)] px-5 py-10 text-center text-sm text-muted-foreground">
              Usage will appear after the first customer request.
            </div>
          )}
        </section>

        <section className="mt-10 rounded-lg bg-[var(--surface-sunken)] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-background text-accent-600 shadow-subtle dark:text-accent-300">
              <Activity className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">How one request is counted</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A tool is counted only when the runtime actually requests it.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <div className="group relative rounded-lg bg-background p-4" key={step.label}>
                  <div className="flex items-center justify-between">
                    <Icon className="size-4 text-accent-600 transition-transform duration-500 group-hover:scale-110 dark:text-accent-300" />
                    <span className="text-xs text-muted-foreground">{index + 1}</span>
                  </div>
                  <p className="mt-5 text-sm font-semibold">{step.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                </div>
              );
            })}
          </div>
        </section>
      </PageBody>
    </>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-soft)] p-4 transition-colors duration-300 hover:bg-[var(--surface-sunken)] sm:p-5">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-6 text-2xl font-semibold text-foreground sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function AgentValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 md:block md:text-right">
      <span className="text-xs text-muted-foreground md:hidden">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
