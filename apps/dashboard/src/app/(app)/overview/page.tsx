'use client';

import type { Agent, KnowledgeSource } from '@voomate/core';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Plug,
  Radio,
} from 'lucide-react';
import { VoomateOperatingContext } from '@/components/voomate-operating-context';
import { useApiQuery } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/cn';

interface UsageSummary {
  textMessages: number;
  voiceMinutes: number;
}

interface ConversationSummary {
  id: string;
}

interface ReadConnection {
  id: string;
  status: 'pending' | 'active' | 'error' | 'revoked';
}

type SetupStep = {
  title: string;
  detail: string;
  href: string;
  complete: boolean;
  optional?: boolean;
  icon: typeof Bot;
};

export default function OverviewPage() {
  const { organization } = useSession();
  const [greeting, setGreeting] = useState('Welcome back');
  const [today, setToday] = useState('Today');
  const agentRailRef = useRef<HTMLDivElement>(null);
  const apiEnabled = organization !== undefined;
  const workspace = organization?.name ?? 'your workspace';

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    setGreeting(hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
    setToday(
      new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      }).format(now),
    );
  }, []);

  const agentsQuery = useApiQuery<{ agents: Agent[] }>(apiEnabled ? '/v1/agents' : null);
  const conversationsQuery = useApiQuery<{ conversations: ConversationSummary[] }>(
    apiEnabled ? '/v1/conversations?limit=100' : null,
  );
  const usageQuery = useApiQuery<UsageSummary>(apiEnabled ? '/v1/usage/summary' : null);
  const connectionsQuery = useApiQuery<{ connections: ReadConnection[] }>(
    apiEnabled ? '/v1/connect/read-connections' : null,
  );

  const agents = agentsQuery.data?.agents ?? [];
  const primaryAgent = agents[0];
  const agentPath = primaryAgent ? '/agents/' + primaryAgent.id : '/agents';
  const knowledgeQuery = useApiQuery<{ sources: KnowledgeSource[] }>(
    primaryAgent ? '/v1/agents/' + primaryAgent.id + '/knowledge' : null,
  );

  const conversations = conversationsQuery.data?.conversations ?? [];
  const sources = knowledgeQuery.data?.sources ?? [];
  const activeAgents = agents.filter((agent) => agent.status === 'active').length;
  const activeConnections = (connectionsQuery.data?.connections ?? []).filter(
    (connection) => connection.status === 'active',
  ).length;
  const readyKnowledge = sources.some((source) => source.status === 'ready');
  const loading =
    agentsQuery.loading ||
    conversationsQuery.loading ||
    usageQuery.loading ||
    connectionsQuery.loading;

  const setupSteps: SetupStep[] = [
    {
      title: 'Create your Web Agent',
      detail: 'Name it and add your business website.',
      href: '/agents',
      complete: primaryAgent !== undefined,
      icon: Bot,
    },
    {
      title: 'Teach it about your business',
      detail: 'Add your website, documents, or approved answers.',
      href: primaryAgent ? agentPath + '/knowledge' : '/agents',
      complete: readyKnowledge,
      icon: BookOpen,
    },
    {
      title: 'Connect live information',
      detail: 'Optional for orders, availability, accounts, and other current data.',
      href: '/integrations',
      complete: activeConnections > 0,
      optional: true,
      icon: Plug,
    },
    {
      title: 'Test and publish',
      detail: 'Try a customer question before adding the agent to your site.',
      href: primaryAgent ? agentPath + '/playground' : '/agents',
      complete: primaryAgent?.status === 'active',
      icon: Radio,
    },
  ];

  const completed = setupSteps.filter((step) => step.complete).length;
  const nextStep =
    setupSteps.find((step) => !step.complete && !step.optional) ??
    setupSteps.find((step) => !step.complete);

  const moveAgentRail = (direction: -1 | 1) => {
    agentRailRef.current?.scrollBy({ left: direction * 360, behavior: 'smooth' });
  };

  return (
    <main className="dashboard-overview mx-auto w-full max-w-[1280px] overflow-x-hidden px-5 pb-14 pt-5 sm:px-8 sm:pt-8 lg:px-10">
      <VoomateOperatingContext
        agents={agentsQuery.data?.agents}
        recentConversationCount={conversationsQuery.data?.conversations.length}
      />

      <header
        data-dashboard-motion
        className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-5xl">
          <p className="text-[12px] font-medium text-muted-foreground">{today}</p>
          <h2 className="mt-2 text-3xl font-semibold leading-[1.12] text-foreground sm:text-[2.35rem]">
            {greeting}, {workspace}.
          </h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground">
            Your customer operation is here. Start with the next useful step or open an agent that
            is already working.
          </p>
        </div>
        <Link
          href="/agents"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-[13px] font-semibold text-background transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-90 active:translate-y-px"
        >
          Manage agents
          <ArrowRight className="size-4" />
        </Link>
      </header>

      <LiveRail
        loading={loading}
        items={[
          { label: 'Agents live', value: String(activeAgents) },
          { label: 'Connections ready', value: String(activeConnections) },
          { label: 'Recent conversations', value: String(conversations.length) },
          { label: 'Messages this month', value: String(usageQuery.data?.textMessages ?? 0) },
          { label: 'Knowledge', value: readyKnowledge ? 'Ready' : 'Needs attention' },
        ]}
      />

      <section className="mt-6 grid grid-flow-dense grid-cols-1 gap-5 xl:grid-cols-12">
        <div
          data-dashboard-stack
          className="rounded-lg bg-[var(--surface-sunken)] p-5 sm:p-7 xl:col-span-8"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[14px] font-semibold text-foreground">Your next steps</p>
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                Finish setup once, then let Voomate keep the operation in sync.
              </p>
            </div>
            <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">
              {completed} of {setupSteps.length}
            </span>
          </div>

          <div className="mt-5 h-1 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.09]">
            <div
              className="h-full rounded-full bg-accent-400 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{
                transform: 'scaleX(' + completed / setupSteps.length + ')',
                transformOrigin: 'left',
              }}
            />
          </div>

          <ol className="mt-5 space-y-1.5">
            {setupSteps.map((step) => {
              const isNext = nextStep?.title === step.title;
              const Icon = step.icon;
              return (
                <li key={step.title}>
                  <Link
                    href={step.href}
                    className={cn(
                      'group flex min-h-[68px] items-center gap-3 rounded-lg px-3 py-3 transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:translate-y-px sm:px-4',
                      isNext
                        ? 'bg-accent-50 dark:bg-accent-950/30'
                        : 'hover:bg-white dark:hover:bg-white/[0.05]',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-lg',
                        step.complete
                          ? 'bg-positive-soft text-positive dark:bg-emerald-950/35'
                          : isNext
                            ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200'
                            : 'bg-white text-muted-foreground dark:bg-white/[0.06]',
                      )}
                    >
                      {step.complete ? <Check className="size-4" /> : <Icon className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-foreground">
                        {step.title}
                        {step.optional && (
                          <span className="text-[11px] font-medium text-muted-foreground">
                            Optional
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] leading-5 text-muted-foreground">
                        {step.detail}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        <aside
          data-dashboard-stack
          className="rounded-lg bg-[var(--surface-soft)] p-5 sm:p-7 xl:col-span-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px] font-semibold text-foreground">Workspace pulse</p>
            <span
              className={cn(
                'flex items-center gap-1.5 text-[11px] font-medium',
                loading || activeAgents === 0 ? 'text-muted-foreground' : 'text-positive',
              )}
            >
              <span className="relative flex size-2">
                {!loading && activeAgents > 0 && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-35" />
                )}
                <span
                  className={cn(
                    'relative inline-flex size-2 rounded-full',
                    loading || activeAgents === 0 ? 'bg-ink-400' : 'bg-positive',
                  )}
                />
              </span>
              {loading ? 'Checking' : activeAgents > 0 ? 'Live' : 'Quiet'}
            </span>
          </div>
          <dl className="mt-7 space-y-7">
            <Metric
              label="Agents live"
              value={loading ? '—' : String(activeAgents)}
              detail={String(agents.length) + ' created'}
            />
            <Metric
              label="Recent conversations"
              value={loading ? '—' : String(conversations.length)}
              detail={conversations.length === 100 ? 'Latest 100 shown' : 'In this workspace'}
            />
            <Metric
              label="Messages this month"
              value={loading ? '—' : String(usageQuery.data?.textMessages ?? 0)}
              detail={String(usageQuery.data?.voiceMinutes ?? 0) + ' voice minutes'}
            />
          </dl>
          <Link
            href="/usage"
            className="mt-7 inline-flex min-h-9 items-center gap-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            View usage <ArrowRight className="size-3.5" />
          </Link>
        </aside>

        <div data-dashboard-stack className="min-w-0 xl:col-span-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">Your agents</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">Pick up where you left off.</p>
            </div>
            <div className="flex items-center gap-1.5">
              {agents.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => moveAgentRail(-1)}
                    aria-label="Previous agents"
                    title="Previous agents"
                    className="grid size-9 place-items-center rounded-lg bg-[var(--surface-soft)] text-muted-foreground transition-[background-color,color,transform] duration-300 hover:bg-[var(--surface-sunken)] hover:text-foreground active:translate-y-px"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveAgentRail(1)}
                    aria-label="Next agents"
                    title="Next agents"
                    className="grid size-9 place-items-center rounded-lg bg-[var(--surface-soft)] text-muted-foreground transition-[background-color,color,transform] duration-300 hover:bg-[var(--surface-sunken)] hover:text-foreground active:translate-y-px"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}
              <Link
                href="/agents"
                className="ml-1 inline-flex min-h-9 items-center gap-1.5 px-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                View all <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {agents.length === 0 ? (
            <div className="mt-4 flex min-h-44 flex-col items-start justify-center rounded-lg bg-[var(--surface-sunken)] px-6 py-8 sm:px-8">
              <span className="grid size-10 place-items-center rounded-lg bg-accent-50 text-accent-700 dark:bg-accent-950/30 dark:text-accent-200">
                <Bot className="size-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-foreground">
                Create your first agent
              </h3>
              <p className="mt-1 max-w-md text-[13px] leading-5 text-muted-foreground">
                Start with the Web Agent. Teach, test, and publish it from one place.
              </p>
              <Link
                href="/agents"
                className="mt-5 inline-flex min-h-9 items-center gap-2 rounded-lg bg-foreground px-3.5 text-[12.5px] font-semibold text-background transition-[opacity,transform] duration-300 hover:opacity-90 active:translate-y-px"
              >
                Choose an agent <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <div
              ref={agentRailRef}
              className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {agents.map((agent) => (
                <AgentRow agent={agent} key={agent.id} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function LiveRail({
  items,
  loading,
}: {
  items: Array<{ label: string; value: string }>;
  loading: boolean;
}) {
  return (
    <div
      data-dashboard-motion
      className="dashboard-live-rail mt-7 overflow-hidden rounded-lg bg-[var(--surface-soft)] py-2.5"
      aria-label="Live workspace status"
    >
      <div className="dashboard-live-track flex w-max items-center">
        {[false, true].map((duplicate) => (
          <div
            key={String(duplicate)}
            aria-hidden={duplicate || undefined}
            className="flex shrink-0 items-center"
          >
            {items.map((item) => (
              <div key={item.label} className="flex items-center gap-2 px-5 text-[11.5px]">
                <span className="size-1.5 rounded-full bg-accent-400" />
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {loading ? '—' : item.value}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <dt>
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{detail}</p>
      </dt>
      <dd className="text-2xl font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function AgentRow({ agent }: { agent: Agent }) {
  const live = agent.status === 'active';
  return (
    <Link
      href={'/agents/' + agent.id}
      className="group flex min-h-28 w-[min(22rem,86vw)] shrink-0 snap-start items-center gap-4 rounded-lg bg-[var(--surface-soft)] px-4 py-4 transition-[background-color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-[var(--surface-sunken)] hover:shadow-[0_10px_30px_rgba(20,20,18,0.06)] active:translate-y-px sm:px-5"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-foreground dark:bg-white/[0.07]">
        <Bot className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-foreground">
          {agent.name}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {live ? (
            <span className="size-1.5 rounded-full bg-positive" />
          ) : (
            <Circle className="size-2.5" />
          )}
          {live ? 'Live' : agent.status === 'paused' ? 'Paused' : 'Not active'}
          {agent.voiceEnabled && ' · Chat and voice'}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
    </Link>
  );
}
