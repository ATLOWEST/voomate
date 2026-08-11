'use client';

import Link from 'next/link';
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

const setupSteps = [
  {
    title: 'Create an agent',
    description: 'Give your AI teammate a role and a name.',
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
    title: 'Create your first agent',
    description: 'Start with sales, support, booking, or a custom role.',
    href: '/agents',
    action: 'Create agent',
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

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-600">
            Command centre
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Welcome to {workspace}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            Set up your AI team once, then deploy it wherever your customers need help.
          </p>
        </div>
        <Link
          href="/agents"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-700 focus-visible:outline-none"
        >
          <Sparkles className="size-4" />
          Create an agent
        </Link>
      </header>

      <section className="ember-wash overflow-hidden rounded-2xl border border-accent-200 shadow-subtle dark:border-accent-900/60">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.05fr_1.95fr] lg:px-8 lg:py-8">
          <div>
            <div className="mb-5 inline-flex size-10 items-center justify-center rounded-xl bg-accent-600 text-white shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Get your first agent live</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Complete these four small steps. We’ll keep the technical details out of your way.
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

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-2xl border border-border bg-card shadow-subtle">
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
              <CircleAlert className="size-3.5" />
              Not live yet
            </span>
          </div>
          <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              ['Agents live', '0', 'Create an agent to begin', Bot],
              ['Connected systems', '0', 'Connect a tool or knowledge', PlugZap],
              ['Customer conversations', '0', 'Publish to start helping', MessageSquare],
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

        <div className="rounded-2xl border border-border bg-card p-6 shadow-subtle">
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

      <section className="mt-6 rounded-2xl border border-border bg-card px-6 py-5 shadow-subtle">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
              <Globe2 className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">One agent, every channel</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your web, voice and calling agents will share the same knowledge and permissions.
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
