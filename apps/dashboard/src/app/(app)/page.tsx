'use client';

import Link from 'next/link';
import type { Agent } from '@voomate/core';
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  FileText,
  Globe2,
  MessageSquare,
  PlugZap,
  Radio,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks';
import { VoomateOperatingContext } from '@/components/voomate-operating-context';

interface UsageSummary {
  textMessages: number;
  voiceMinutes: number;
}

interface ConversationSummary {
  id: string;
}

const setupSteps = [
  {
    title: 'Configure the Web Agent',
    description: 'Set its business identity, tone, and customer scope.',
    href: '/agents',
    icon: Bot,
    complete: false,
  },
  {
    title: 'Connect knowledge',
    description: 'Add your website, documents, or FAQs.',
    href: '/agents',
    icon: FileText,
    complete: false,
  },
  {
    title: 'Connect your tools',
    description: 'Let your agent safely use the apps you already rely on.',
    href: '/integrations',
    icon: PlugZap,
    complete: false,
  },
  {
    title: 'Test and publish',
    description: 'Try a real conversation before visitors see it.',
    href: '/agents',
    icon: Radio,
    complete: false,
  },
];

const nextActions = [
  {
    title: 'Choose your agent team',
    description:
      'Start with Web Agent and see the planned CRM Tool, SEO, and Calling Agent sequence.',
    href: '/agents',
    action: 'Open agents',
    icon: WandSparkles,
  },
  {
    title: 'Connect a business system',
    description: 'Bring in the live data and actions your agent needs.',
    href: '/integrations',
    action: 'Browse connections',
    icon: PlugZap,
  },
];

export default function OverviewPage() {
  const { organization } = useSession();
  const workspace = organization?.name ?? 'your workspace';
  const completed = setupSteps.filter((step) => step.complete).length;
  const apiEnabled = organization !== undefined;
  const { data: agentData } = useApiQuery<{ agents: Agent[] }>(apiEnabled ? '/v1/agents' : null);
  const { data: conversationData } = useApiQuery<{ conversations: ConversationSummary[] }>(
    apiEnabled ? '/v1/conversations?limit=100' : null,
  );
  const { data: usage } = useApiQuery<UsageSummary>(apiEnabled ? '/v1/usage/summary' : null);
  const agents = agentData?.agents ?? [];
  const activeAgents = agents.filter(({ status }) => status === 'published').length;
  const recentConversations = conversationData?.conversations.length ?? 0;

  return (
    <main className="dashboard-overview mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <VoomateOperatingContext agents={agentData?.agents} />
      <header
        data-dashboard-motion
        className="dashboard-overview__header mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-600">
            Your live operation
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Welcome to {workspace}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            Plug in the widget, connect approved business truth, and publish one tested workflow.
          </p>
        </div>
        <Link
          href="/agents"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-700 focus-visible:outline-none"
        >
          <Sparkles className="size-4" />
          Configure agents
        </Link>
      </header>

      <section
        data-dashboard-motion
        className="dashboard-launch ember-wash overflow-hidden rounded-2xl border border-accent-200 shadow-subtle dark:border-accent-900/60"
      >
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.05fr_1.95fr] lg:px-8 lg:py-8">
          <div>
            <div className="mb-5 inline-flex size-10 items-center justify-center rounded-xl bg-accent-600 text-white shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Get your agent operation live</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Four visible steps take the platform from an empty workspace to a tested customer
              workflow.
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent-100 dark:bg-accent-950">
                <div className="h-full w-0 rounded-full bg-accent-600" />
              </div>
              <span className="shrink-0 font-medium text-foreground">{completed} of 4</span>
            </div>
          </div>

          <ol className="grid gap-2 sm:grid-cols-2">
            {setupSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title}>
                  <Link
                    href={step.href}
                    className="group flex min-h-[104px] items-start gap-3 rounded-xl border border-transparent bg-white/70 p-4 transition hover:border-accent-200 hover:bg-white hover:shadow-subtle dark:bg-ink-900/70 dark:hover:border-accent-800"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        step.complete
                          ? 'bg-positive text-white'
                          : 'bg-accent-100 text-accent-700 dark:bg-accent-900/60 dark:text-accent-200',
                      )}
                    >
                      {step.complete ? <Check className="size-4" /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3 text-sm font-semibold text-foreground">
                        {step.title}
                        <Icon className="size-4 text-muted-foreground transition group-hover:text-accent-600" />
                      </span>
                      <span className="mt-1 block text-[13px] leading-5 text-muted-foreground">
                        {step.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="dashboard-operation-grid mt-8 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div
          data-dashboard-motion
          className="rounded-2xl border border-border bg-card shadow-subtle"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
                Your AI operation
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Live information appears here once you publish an agent.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              {activeAgents > 0 ? (
                <CircleCheck className="size-3.5 text-positive" />
              ) : (
                <CircleAlert className="size-3.5" />
              )}
              {activeAgents > 0 ? 'Live' : 'Ready to configure'}
            </span>
          </div>
          <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              [
                'Agents live',
                String(activeAgents),
                `${agents.length} configured in this workspace`,
                Bot,
              ],
              [
                'Messages this month',
                String(usage?.textMessages ?? 0),
                `${usage?.voiceMinutes ?? 0} voice minutes`,
                MessageSquare,
              ],
              [
                'Recent conversations',
                String(recentConversations),
                recentConversations === 100
                  ? 'Showing the latest 100'
                  : 'Recorded for this workspace',
                Radio,
              ],
            ].map(([label, value, detail, Icon]) => {
              const MetricIcon = Icon as typeof Bot;
              return (
                <div className="p-5" key={label as string}>
                  <MetricIcon className="mb-5 size-4 text-muted-foreground" />
                  <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                    {value as string}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{label as string}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail as string}</p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 border-t border-border bg-ink-50/70 px-6 py-4 text-sm text-muted-foreground dark:bg-ink-950/30">
            <CircleCheck className="size-4 shrink-0 text-positive" />
            Your workspace is secure and ready to configure.
          </div>
        </div>

        <div
          data-dashboard-motion
          className="rounded-2xl border border-border bg-card p-6 shadow-subtle"
        >
          <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
            Continue building
          </h2>
          <div className="mt-4 divide-y divide-border">
            {nextActions.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className="group flex gap-3 py-4 first:pt-0 last:pb-0"
                  href={item.href}
                  key={item.title}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-[13px] leading-5 text-muted-foreground">
                      {item.description}
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-600">
                      {item.action}{' '}
                      <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section
        data-dashboard-motion
        className="mt-6 rounded-2xl border border-border bg-card px-6 py-5 shadow-subtle"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
              <Globe2 className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Your agents, one shared operation
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Web and Voice Calling connect through the Integration Agent to approved knowledge,
                tools, permissions, and logs.
              </p>
            </div>
          </div>
          <Link
            href="/agents"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-accent-600 hover:text-accent-700"
          >
            Explore agents <ChevronRight className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
