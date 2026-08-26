'use client';

import type { KnowledgeSource } from '@voomate/core';
import Link from 'next/link';
import {
  AppWindow,
  ArrowRight,
  BookOpenCheck,
  Braces,
  Check,
  CircleDashed,
  Globe2,
  MonitorSmartphone,
  MessageSquareText,
  Play,
  Radio,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useAgent, type AgentDeployment } from '@/components/agent/shell';
import { Callout } from '@/components/ui/callout';
import { api } from '@/lib/api';
import { useApiAction, useApiQuery } from '@/lib/hooks';
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
  const { agent, isPlaceholder, deployment, refreshDeployment } = useAgent();
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
  const published = agent.status === 'active';
  const targetReady = deployment.platform !== null;
  const installationReady = deployment.verified;
  const readinessChecks = [targetReady, knowledgeReady, domainsReady, installationReady, published];
  const readiness = Math.round(
    (readinessChecks.filter(Boolean).length / readinessChecks.length) * 100,
  );
  const agentPath = `/agents/${agent.id}`;
  const websiteHost = hostFrom(agent.websiteUrl);
  const dataProblem = knowledge.error ?? conversations.error;
  const selectDeployment = useApiAction(
    async (auth, platform: Exclude<AgentDeployment['platform'], null>) => {
      await api.post(`/v1/agents/${agent.id}/deployment`, { platform }, auth);
      refreshDeployment();
    },
  );

  if (isPlaceholder) {
    return <CreateFirstState />;
  }

  return (
    <main className="agent-operations-enter min-w-0 pb-12">
      {readiness < 100 && (
        <SetupGuide
          agentPath={agentPath}
          deployment={deployment}
          knowledgeReady={knowledgeReady}
          domainsReady={domainsReady}
          published={published}
          selecting={selectDeployment.busy}
          selectionError={selectDeployment.error}
          onSelect={(platform) => void selectDeployment.run(platform)}
        />
      )}

      <section
        className={`overflow-hidden rounded-lg bg-[var(--surface-soft)] ${readiness < 100 ? 'mt-6' : ''}`}
      >
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
              complete={targetReady}
              title="Deployment platform"
              detail={platformLabel(deployment.platform)}
              href={agentPath}
              action={targetReady ? 'Review' : 'Choose'}
            />
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
              complete={installationReady}
              title="SDK installation"
              detail={
                installationReady
                  ? `Verified on ${deployment.verifiedOrigin ?? 'an approved domain'}`
                  : domainsReady
                    ? 'SDK not installed or not opened yet.'
                    : 'Approve a domain, install the SDK, then open it once.'
              }
              href={`${agentPath}/install`}
              action={installationReady ? 'Review' : 'Install'}
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
  return (
    <main className="min-w-0 pb-12">
      <section className="rounded-xl bg-[var(--surface-soft)] px-6 py-10 sm:px-9">
        <p className="text-[17px] font-semibold text-foreground">This agent has not been added</p>
        <p className="mt-2 max-w-lg text-[13px] leading-5 text-muted-foreground">
          Return to Agents and add it from the catalog before configuring a deployment.
        </p>
        <Link
          href="/agents"
          className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-[13px] font-semibold text-background"
        >
          Back to agents <ArrowRight className="size-4" />
        </Link>
      </section>
    </main>
  );
}

function SetupGuide({
  agentPath,
  deployment,
  knowledgeReady,
  domainsReady,
  published,
  selecting,
  selectionError,
  onSelect,
}: {
  agentPath: string;
  deployment: AgentDeployment;
  knowledgeReady: boolean;
  domainsReady: boolean;
  published: boolean;
  selecting: boolean;
  selectionError: string | undefined;
  onSelect: (platform: Exclude<AgentDeployment['platform'], null>) => void;
}) {
  const steps = [
    deployment.platform !== null,
    domainsReady && deployment.verified,
    knowledgeReady,
    published,
  ];
  const completed = steps.filter(Boolean).length;

  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[16px] font-semibold text-foreground">Set up this Web Agent</p>
          <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted-foreground">
            Complete each verified step before the agent can be turned on for customers.
          </p>
        </div>
        <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">
          {completed} of {steps.length}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-[12px] font-semibold text-foreground">1. Choose a platform</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <PlatformChoice
            icon={Globe2}
            label="Website"
            selected={deployment.platform === 'website'}
            disabled={selecting}
            onClick={() => onSelect('website')}
          />
          <PlatformChoice
            icon={AppWindow}
            label="Web app"
            selected={deployment.platform === 'web_app'}
            disabled={selecting}
            onClick={() => onSelect('web_app')}
          />
          <PlatformChoice
            icon={Smartphone}
            label="iOS"
            note="SDK in development"
            selected={deployment.platform === 'ios'}
            disabled={selecting}
            onClick={() => onSelect('ios')}
          />
          <PlatformChoice
            icon={MonitorSmartphone}
            label="Android"
            note="SDK in development"
            selected={deployment.platform === 'android'}
            disabled={selecting}
            onClick={() => onSelect('android')}
          />
        </div>
        {selectionError && <p className="mt-2 text-[12px] text-critical">{selectionError}</p>}
      </div>

      <ol className="mt-5 grid gap-2 md:grid-cols-3">
        <GuideStep
          number={2}
          complete={domainsReady && deployment.verified}
          title={deployment.verified ? 'SDK verified' : 'Install and verify SDK'}
          detail={
            deployment.verified
              ? `Confirmed on ${deployment.verifiedOrigin ?? 'approved domain'}`
              : domainsReady
                ? 'SDK not installed or not opened yet.'
                : 'Add an approved domain, then install.'
          }
          href={`${agentPath}/install`}
        />
        <GuideStep
          number={3}
          complete={knowledgeReady}
          title="Add approved knowledge"
          detail={knowledgeReady ? 'Knowledge is ready.' : 'Add a website, document or answer.'}
          href={`${agentPath}/knowledge`}
        />
        <GuideStep
          number={4}
          complete={published}
          title={published ? 'Agent is live' : 'Test, then turn on'}
          detail={published ? 'Runtime activation is confirmed.' : 'Use Test before the power control.'}
          href={`${agentPath}/playground`}
        />
      </ol>
    </section>
  );
}

function PlatformChoice({
  icon: Icon,
  label,
  note,
  selected = false,
  disabled = false,
  onClick,
}: {
  icon: typeof Globe2;
  label: string;
  note?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-16 items-center gap-3 rounded-lg border px-3.5 text-left transition-colors ${
        selected
          ? 'border-accent-400 bg-accent-50 text-foreground dark:bg-accent-950/25'
          : 'border-[var(--border-default)] bg-[var(--surface-soft)] text-muted-foreground'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.8} />
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold">{label}</span>
        {note && <span className="mt-0.5 block text-[10.5px]">{note}</span>}
      </span>
    </button>
  );
}

function GuideStep({
  number,
  complete,
  title,
  detail,
  href,
}: {
  number: number;
  complete: boolean;
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <li className="flex min-h-24 gap-3 rounded-lg bg-[var(--surface-soft)] p-3.5">
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-md text-[11px] font-semibold ${
          complete ? 'bg-positive-soft text-positive' : 'bg-[var(--surface-sunken)] text-muted-foreground'
        }`}
      >
        {complete ? <Check className="size-3.5" /> : number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-[11.5px] leading-4 text-muted-foreground">{detail}</span>
        <Link href={href} className="mt-2 inline-flex text-[11.5px] font-semibold text-accent-700">
          Open step
        </Link>
      </span>
    </li>
  );
}

function platformLabel(platform: AgentDeployment['platform']): string {
  if (platform === 'website') return 'Website';
  if (platform === 'web_app') return 'Web app';
  if (platform === 'ios') return 'iOS';
  if (platform === 'android') return 'Android';
  return 'Choose where this agent will run.';
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
  const live = status === 'active';
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
