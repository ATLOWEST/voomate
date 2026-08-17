'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { KnowledgeSource } from '@voomate/core';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpenCheck,
  Braces,
  Check,
  CircleDashed,
  CodeXml,
  Globe2,
  MessageSquareText,
  Play,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { useAgent } from '@/components/agent/shell';
import { Callout } from '@/components/ui/callout';
import { useApiQuery } from '@/lib/hooks';
import { useSession } from '@/lib/session';

type Conversation = {
  id: string;
  channel: 'text' | 'voice';
  status: 'active' | 'ended' | 'abandoned' | 'escalated';
  messageCount: number;
  pageUrl: string | null;
  satisfaction: number | null;
  startedAt: string;
};

type ReadCapability = { name?: string };

type ReadConnection = {
  id: string;
  agentId: string;
  name: string;
  status: 'pending' | 'active' | 'error' | 'revoked';
  capabilities: ReadCapability[] | null;
  lastVerifiedAt: string | null;
};

export function AgentOverview() {
  const { agent, isPlaceholder } = useAgent();
  const { organization } = useSession();
  const canReadLiveState = organization !== undefined && !isPlaceholder;

  const knowledge = useApiQuery<{ sources: KnowledgeSource[] }>(
    canReadLiveState ? `/v1/agents/${agent.id}/knowledge` : null,
    { pollMs: 5_000 },
  );
  const conversations = useApiQuery<{ conversations: Conversation[] }>(
    canReadLiveState ? `/v1/conversations?agentId=${encodeURIComponent(agent.id)}&limit=50` : null,
  );
  const connections = useApiQuery<{ connections: ReadConnection[] }>(
    canReadLiveState ? '/v1/connect/read-connections' : null,
  );

  const sources = knowledge.data?.sources ?? [];
  const recentConversations = conversations.data?.conversations ?? [];
  const agentConnections = (connections.data?.connections ?? []).filter(
    (connection) => connection.agentId === agent.id && connection.status !== 'revoked',
  );
  const readySources = sources.filter((source) => source.status === 'ready');
  const activeConnections = agentConnections.filter((connection) => connection.status === 'active');
  const capabilityCount = activeConnections.reduce(
    (total, connection) => total + (connection.capabilities?.length ?? 0),
    0,
  );
  const escalations = recentConversations.filter(
    (conversation) => conversation.status === 'escalated',
  ).length;
  const websiteReady = Boolean(agent.websiteUrl);
  const domainsReady = (agent.allowedOrigins?.length ?? 0) > 0;
  const knowledgeReady = readySources.length > 0;
  const published = agent.status === 'published';
  const readinessChecks = [websiteReady, knowledgeReady, domainsReady, published];
  const readiness = Math.round(
    (readinessChecks.filter(Boolean).length / readinessChecks.length) * 100,
  );
  const agentPath = `/agents/${agent.id}`;
  const websiteHost = hostFrom(agent.websiteUrl);
  const dataProblem = knowledge.error ?? conversations.error;

  if (isPlaceholder) {
    return <CreateFirstState />;
  }

  return (
    <main className="agent-operations-enter min-w-0 pb-12">
      <section className="overflow-hidden rounded-lg bg-[var(--surface-soft)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <div className="px-6 py-7 sm:px-8 sm:py-9">
            <div className="max-w-2xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <StatusLabel status={agent.status} />
                {agent.voiceEnabled && <SmallLabel>Chat + voice</SmallLabel>}
                <SmallLabel>Read-only by default</SmallLabel>
              </div>
              <h2 className="max-w-xl text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-[2rem]">
                Customer operations, in one place.
              </h2>
              <p className="mt-3 max-w-xl text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
                Teach the agent what is true, connect the systems it may read, test real requests,
                then publish when every required check is ready.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <ActionLink href={`${agentPath}/playground`} icon={Play} primary>
                  Test agent
                </ActionLink>
                <ActionLink href={`${agentPath}/knowledge`} icon={BookOpenCheck}>
                  Manage knowledge
                </ActionLink>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-sunken)] px-6 py-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold text-muted-foreground">Launch readiness</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                  {readiness}%
                </p>
              </div>
              <span className="grid size-11 place-items-center rounded-lg bg-white text-accent-600 dark:bg-white/[0.07]">
                {readiness === 100 ? (
                  <Check className="size-5" />
                ) : (
                  <CircleDashed className="size-5" />
                )}
              </span>
            </div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-accent-500 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{ transform: `scaleX(${readiness / 100})`, transformOrigin: 'left' }}
              />
            </div>
            <p className="mt-4 text-[13px] leading-5 text-muted-foreground">
              {readiness === 100
                ? 'The required launch checks are complete.'
                : 'Finish the open setup items before sending public traffic.'}
            </p>
          </div>
        </div>
      </section>

      {dataProblem !== undefined && (
        <div className="mt-5">
          <Callout tone="caution" title="Some operating data is unavailable">
            {dataProblem}
          </Callout>
        </div>
      )}

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Recent conversations"
          value={recentConversations.length}
          detail="Latest 50"
        />
        <Metric
          label="Needs human review"
          value={escalations}
          detail="Escalated"
          tone={escalations > 0 ? 'caution' : 'default'}
        />
        <Metric
          label="Ready knowledge"
          value={readySources.length}
          detail={`${sources.length} total sources`}
        />
        <Metric
          label="Live read tools"
          value={capabilityCount}
          detail={`${activeConnections.length} connections`}
        />
      </section>

      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <section>
          <SectionHeading
            title="Finish setup"
            description="Each step updates the same deployed agent. There is no separate platform dashboard."
          />
          <div className="mt-4 space-y-2">
            <SetupRow
              complete={websiteReady}
              title="Business website"
              detail={websiteHost ?? 'Add the site this agent represents.'}
              href={`${agentPath}/configuration`}
              action="Review"
            />
            <SetupRow
              complete={knowledgeReady}
              title="Approved knowledge"
              detail={
                knowledgeReady
                  ? `${readySources.length} sources ready`
                  : 'Add a website, document or approved answer.'
              }
              href={`${agentPath}/knowledge`}
              action={knowledgeReady ? 'Manage' : 'Add source'}
            />
            <SetupRow
              complete={activeConnections.length > 0}
              optional
              title="Live business data"
              detail={
                activeConnections.length > 0
                  ? `${activeConnections.length} read-only connections active`
                  : 'Connect current inventory, orders, services or account data.'
              }
              href="/integrations"
              action={activeConnections.length > 0 ? 'Manage' : 'Connect'}
            />
            <SetupRow
              complete={domainsReady}
              title="Install and domains"
              detail={
                domainsReady
                  ? `${agent.allowedOrigins.length} approved domains`
                  : 'Approve where the widget is allowed to run.'
              }
              href={`${agentPath}/install`}
              action="Install"
            />
          </div>
        </section>

        <section>
          <SectionHeading
            title="Business context"
            description="A compact view of the evidence available for each customer turn."
          />
          <div className="mt-4 rounded-lg bg-[var(--surface-soft)] p-5">
            <ContextRow icon={Globe2} label="Website" value={websiteHost ?? 'Not connected'} />
            <ContextRow
              icon={BookOpenCheck}
              label="Knowledge"
              value={`${readySources.length} ready sources`}
            />
            <ContextRow icon={Braces} label="Live data" value={`${capabilityCount} named reads`} />
            <ContextRow icon={ShieldCheck} label="Write access" value="Separately approved" />
            <Link
              href={`${agentPath}/knowledge`}
              className="mt-5 inline-flex min-h-9 items-center gap-2 text-[13px] font-semibold text-accent-700 transition-colors hover:text-accent-600 dark:text-accent-300"
            >
              Review source evidence <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </section>
      </div>

      <section className="mt-8">
        <SectionHeading
          title="Customer handling"
          description="The runtime selects only the layers needed for each request and keeps sensitive actions gated."
          action={
            <Link
              href="/logs"
              className="inline-flex min-h-9 items-center gap-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              View activity <ArrowRight className="size-3.5" />
            </Link>
          }
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <CapabilityRow
            icon={BookOpenCheck}
            title="Grounded answers"
            description="Uses approved business knowledge and synthesizes a direct response."
            state={knowledgeReady ? 'Ready' : 'Needs knowledge'}
            ready={knowledgeReady}
          />
          <CapabilityRow
            icon={Globe2}
            title="In-product guidance"
            description="Understands the current page and uses verified destinations for navigation."
            state={domainsReady ? 'Ready' : 'Needs install'}
            ready={domainsReady}
          />
          <CapabilityRow
            icon={Braces}
            title="Live business reads"
            description="Checks named client-side capabilities without database write access."
            state={activeConnections.length > 0 ? 'Connected' : 'Not connected'}
            ready={activeConnections.length > 0}
          />
          <CapabilityRow
            icon={ShieldCheck}
            title="Controlled actions"
            description="Routes writes through scoped tools, policy checks and confirmation gates."
            state="Governed"
            ready
          />
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading
          title="Recent conversations"
          description="Chat and website voice share one customer history."
          action={
            <Link
              href={`/conversations?agentId=${encodeURIComponent(agent.id)}`}
              className="inline-flex min-h-9 items-center gap-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Open inbox <ArrowRight className="size-3.5" />
            </Link>
          }
        />
        <div className="mt-4">
          {conversations.loading ? (
            <div className="space-y-3 p-5" aria-label="Loading recent conversations">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-12 animate-pulse rounded-md bg-[var(--surface-sunken)]"
                />
              ))}
            </div>
          ) : recentConversations.length === 0 ? (
            <div className="flex min-h-36 items-center gap-4 rounded-lg bg-[var(--surface-soft)] px-5 py-7 sm:px-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--surface-sunken)] text-muted-foreground">
                <MessageSquareText className="size-4.5" />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-foreground">
                  No customer conversations yet
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Use Test agent before publishing to your site.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentConversations.slice(0, 5).map((conversation) => (
                <li
                  key={conversation.id}
                  className="flex items-center gap-4 rounded-lg bg-[var(--surface-soft)] px-5 py-4 sm:px-6"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-sunken)] text-muted-foreground">
                    {conversation.channel === 'voice' ? (
                      <Radio className="size-4" />
                    ) : (
                      <MessageSquareText className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-foreground">
                      {conversation.channel === 'voice' ? 'Website voice' : 'Web chat'}
                      {conversation.pageUrl
                        ? ` on ${hostFrom(conversation.pageUrl) ?? 'site'}`
                        : ''}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {new Date(conversation.startedAt).toLocaleString()} -{' '}
                      {conversation.messageCount} messages
                    </p>
                  </div>
                  <SmallLabel tone={conversation.status === 'escalated' ? 'caution' : 'neutral'}>
                    {conversation.status === 'escalated' ? 'Human review' : conversation.status}
                  </SmallLabel>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function CreateFirstState() {
  const [step, setStep] = useState<'intro' | 'platform'>('intro');
  const [saving, setSaving] = useState(false);
  const { refresh } = useAgent();

  const handlePlatformSelect = async (platform: string) => {
    setSaving(true);
    try {
      // In a real app, this would be a POST to create the draft agent
      // with the selected platform metadata. Since the user asked for autosave
      // on every click, we simulate the network request and refresh the context.
      await api.post('/v1/agents', { name: 'Web Agent', platform });
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (step === 'platform') {
    return (
      <main className="agent-operations-enter min-w-0 pb-12">
        <section className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Select your platform
            </h2>
            <p className="mt-3 text-[15px] text-muted-foreground">
              We'll tailor the agent setup to perfectly integrate with your existing stack.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <button
              onClick={() => handlePlatformSelect('shopify')}
              disabled={saving}
              className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-soft)] p-10 outline-none ring-1 ring-inset ring-black/[0.08] transition-all hover:-translate-y-1 hover:bg-[var(--surface-sunken)] hover:shadow-xl hover:ring-black/[0.12] dark:ring-white/[0.08] dark:hover:ring-white/[0.15]"
            >
              <div className="grid h-16 w-16 place-items-center transition-transform duration-500 ease-out group-hover:scale-105">
                <svg viewBox="0 0 448 512" className="size-[42px] fill-[#95BF47]">
                  <path d="M388.32,104.1a4.66,4.66,0,0,0-4.4-4c-2,0-37.23-.8-37.23-.8s-21.61-20.82-29.62-28.83V503.2L442.76,472S388.72,106.5,388.32,104.1ZM288.65,70.47a116.67,116.67,0,0,0-7.21-17.61C271,32.85,255.42,22,237,22a15,15,0,0,0-4,.4c-.4-.8-1.2-1.2-1.6-2C223.4,11.63,213,7.63,200.58,8c-24,.8-48,18-67.25,48.83-13.61,21.62-24,48.84-26.82,70.06-27.62,8.4-46.83,14.41-47.23,14.81-14,4.4-14.41,4.8-16,18-1.2,10-38,291.82-38,291.82L307.86,504V65.67a41.66,41.66,0,0,0-4.4.4S297.86,67.67,288.65,70.47ZM233.41,87.69c-16,4.8-33.63,10.4-50.84,15.61,4.8-18.82,14.41-37.63,25.62-50,4.4-4.4,10.41-9.61,17.21-12.81C232.21,54.86,233.81,74.48,233.41,87.69ZM200.58,24.44A27.49,27.49,0,0,1,215,28c-6.4,3.2-12.81,8.41-18.81,14.41-15.21,16.42-26.82,42-31.62,66.45-14.42,4.41-28.83,8.81-42,12.81C131.33,83.28,163.75,25.24,200.58,24.44ZM154.15,244.61c1.6,25.61,69.25,31.22,73.25,91.66,2.8,47.64-25.22,80.06-65.65,82.47-48.83,3.2-75.65-25.62-75.65-25.62l10.4-44s26.82,20.42,48.44,18.82c14-.8,19.22-12.41,18.81-20.42-2-33.62-57.24-31.62-60.84-86.86-3.2-46.44,27.22-93.27,94.47-97.68,26-1.6,39.23,4.81,39.23,4.81L221.4,225.39s-17.21-8-37.63-6.4C154.15,221,153.75,239.8,154.15,244.61ZM249.42,82.88c0-12-1.6-29.22-7.21-43.63,18.42,3.6,27.22,24,31.23,36.43Q262.63,78.68,249.42,82.88Z" />
                </svg>
              </div>
              <span className="mt-6 text-[15px] font-medium text-foreground">Shopify</span>
            </button>

            <button
              onClick={() => handlePlatformSelect('custom')}
              disabled={saving}
              className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-soft)] p-10 outline-none ring-1 ring-inset ring-black/[0.08] transition-all hover:-translate-y-1 hover:bg-[var(--surface-sunken)] hover:shadow-xl hover:ring-black/[0.12] dark:ring-white/[0.08] dark:hover:ring-white/[0.15]"
            >
              <div className="grid h-16 w-16 place-items-center rounded-xl transition-transform duration-500 ease-out group-hover:scale-105">
                <CodeXml className="size-12 stroke-[1.5] text-foreground" />
              </div>
              <span className="mt-6 text-[15px] font-medium text-foreground">Custom Stack</span>
              <span className="mt-1 flex gap-3 text-[13px] text-muted-foreground">
                <Globe2 className="size-4" /> Websites
                <span className="mx-1">•</span>
                iOS / Android
              </span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="agent-operations-enter min-w-0 pb-12">
      <section className="overflow-hidden rounded-lg bg-[var(--surface-soft)]">
        <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="px-6 py-9 sm:px-9 sm:py-12">
            <SmallLabel>Web Agent</SmallLabel>
            <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-normal text-foreground">
              Build the agent around your real business.
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-6 text-muted-foreground">
              Install our web agent in your platform and follow the steps as we build. Voomate creates one tenant-scoped agent that you can teach,
              test, install and operate from this workspace.
            </p>
            <div className="mt-7">
              <button
                onClick={() => setStep('platform')}
                className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-foreground px-4 text-[13.5px] font-medium text-background ring-offset-background transition-colors hover:bg-foreground/90"
              >
                Create Web Agent
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="bg-[var(--surface-sunken)] p-6 sm:p-8">
            <p className="text-[13px] font-semibold text-foreground">What happens next</p>
            <ol className="mt-5 space-y-5">
              {[
                'Install our web agent in your platform',
                'All steps follow as we build',
                'Review learned knowledge',
                'Test customer requests',
              ].map((label, index) => (
                <li className="flex items-center gap-3" key={label}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-white text-[12px] font-semibold text-muted-foreground dark:bg-white/[0.07]">
                    {index + 1}
                  </span>
                  <span className="text-[13px] text-muted-foreground">{label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[16px] font-semibold text-foreground">{title}</h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted-foreground">{description}</p>
      </div>
      {action}
    </header>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: number;
  detail: string;
  tone?: 'default' | 'caution';
}) {
  return (
    <div className="rounded-lg bg-[var(--surface-soft)] px-5 py-5">
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span
          className={`text-2xl font-semibold tabular-nums ${tone === 'caution' ? 'text-caution' : 'text-foreground'}`}
        >
          {value}
        </span>
        <span className="pb-0.5 text-[11px] text-muted-foreground">{detail}</span>
      </div>
    </div>
  );
}

function SetupRow({
  complete,
  optional = false,
  title,
  detail,
  href,
  action,
}: {
  complete: boolean;
  optional?: boolean;
  title: string;
  detail: string;
  href: string;
  action: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-[var(--surface-soft)] px-5 py-4">
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-md ${complete ? 'bg-positive-soft text-positive' : 'bg-[var(--surface-sunken)] text-muted-foreground'}`}
      >
        {complete ? <Check className="size-4" /> : <CircleDashed className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13.5px] font-semibold text-foreground">{title}</p>
          {optional && <span className="text-[11px] text-muted-foreground">Optional</span>}
        </div>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{detail}</p>
      </div>
      <Link
        href={href}
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-[var(--surface-hover)]"
      >
        {action} <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function ContextRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[var(--surface-sunken)] text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-[12px] text-muted-foreground">{label}</span>
      <span className="max-w-[55%] truncate text-right text-[12.5px] font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function CapabilityRow({
  icon: Icon,
  title,
  description,
  state,
  ready,
}: {
  icon: typeof Globe2;
  title: string;
  description: string;
  state: string;
  ready: boolean;
}) {
  return (
    <article className="rounded-lg bg-[var(--surface-soft)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-sunken)] text-foreground">
          <Icon className="size-4" />
        </span>
        <SmallLabel tone={ready ? 'positive' : 'neutral'}>{state}</SmallLabel>
      </div>
      <h3 className="mt-5 text-[14px] font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-[13px] leading-5 text-muted-foreground">{description}</p>
    </article>
  );
}

function ActionLink({
  href,
  icon: Icon,
  children,
  primary = false,
}: {
  href: string;
  icon: typeof ArrowRight;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition-[transform,background-color,color,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:translate-y-px ${primary ? 'bg-foreground text-background hover:opacity-90' : 'bg-[var(--surface-sunken)] text-foreground hover:bg-[var(--surface-hover)]'}`}
    >
      <Icon className="size-4" /> {children}
    </Link>
  );
}

function SmallLabel({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'positive' | 'caution';
}) {
  const styles =
    tone === 'positive'
      ? 'bg-positive-soft text-positive'
      : tone === 'caution'
        ? 'bg-caution-soft text-caution'
        : 'bg-[var(--surface-sunken)] text-muted-foreground';
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-md px-2 text-[10.5px] font-semibold ${styles}`}
    >
      {children}
    </span>
  );
}

function StatusLabel({ status }: { status: string }) {
  const live = status === 'published';
  const paused = status === 'paused';
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-md px-2 text-[10.5px] font-semibold ${live ? 'bg-positive-soft text-positive' : paused ? 'bg-caution-soft text-caution' : 'bg-[var(--surface-sunken)] text-muted-foreground'}`}
    >
      <span className="size-1.5 rounded-full bg-current" />{' '}
      {live ? 'Live' : paused ? 'Paused' : 'Draft'}
    </span>
  );
}

function hostFrom(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}
