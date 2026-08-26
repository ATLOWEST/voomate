'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { AGENT_CATALOG, type Agent, type AgentCatalogType } from '@voomate/core';
import { DatabaseZap, Globe2, PhoneCall, Search, type LucideIcon } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { api } from '@/lib/api';
import { useApiAction, useApiQuery } from '@/lib/hooks';
import { useSession } from '@/lib/session';

const catalogIcons: Record<AgentCatalogType, LucideIcon> = {
  web: Globe2,
  crm: DatabaseZap,
  seo: Search,
  calling: PhoneCall,
};

const statusOrder: Record<Agent['status'], number> = {
  active: 4,
  paused: 3,
  draft: 2,
  archived: 1,
};

export function AgentsList() {
  const router = useRouter();
  const { organization } = useSession();
  const { data, error, loading, refetch } = useApiQuery<{ agents: Agent[] }>(
    organization === undefined ? null : '/v1/agents',
  );
  const agents = data?.agents ?? [];

  // Historical duplicate records remain intact for auditability, but the workspace exposes a
  // single, deterministic slot for each capability from now on.
  const agentsByType = useMemo(() => {
    const slots = new Map<AgentCatalogType, Agent>();
    for (const agent of agents) {
      const current = slots.get(agent.catalogType);
      if (!current || statusOrder[agent.status] > statusOrder[current.status]) {
        slots.set(agent.catalogType, agent);
      }
    }
    return slots;
  }, [agents]);

  const { run: createAgent, busy: creating, error: createError } = useApiAction(
    async (auth, catalogType: AgentCatalogType) => {
      const { agent } = await api.post<{ agent: Agent }>('/v1/agents', { catalogType }, auth);
      await refetch();
      router.push(`/agents/${agent.id}`);
    },
  );

  return (
    <>
      <PageHeader
        title="Agents"
        description="Choose the capabilities your business needs. Each type has one workspace slot."
      />
      <PageBody>
        {organization === undefined ? (
          <Callout tone="caution" title="No workspace selected">
            Select a workspace before managing its agents.
          </Callout>
        ) : error !== undefined ? (
          <Callout
            tone="critical"
            title="Could not load your agents"
            action={
              <Button size="sm" onClick={refetch}>
                Retry
              </Button>
            }
          >
            {error}
          </Callout>
        ) : loading ? (
          <AgentCatalogSkeleton />
        ) : (
          <>
            <section aria-label="Agent capabilities" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {AGENT_CATALOG.map((definition) => {
                const agent = agentsByType.get(definition.id);
                return (
                  <AgentTile
                    key={definition.id}
                    definition={definition}
                    agent={agent}
                    creating={creating}
                    onCreate={() => void createAgent(definition.id)}
                  />
                );
              })}
            </section>
            {createError && (
              <div className="mt-5">
                <Callout tone="critical" title="Could not create the agent">
                  {createError}
                </Callout>
              </div>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}

function AgentTile({
  definition,
  agent,
  creating,
  onCreate,
}: {
  definition: (typeof AGENT_CATALOG)[number];
  agent: Agent | undefined;
  creating: boolean;
  onCreate: () => void;
}) {
  const Icon = catalogIcons[definition.id];
  const state = agent
    ? agent.status === 'active'
      ? 'Live'
      : agent.status === 'paused'
        ? 'Paused'
        : agent.status === 'archived'
          ? 'Archived'
          : 'Setup'
    : definition.releaseState === 'released'
      ? 'Available'
      : definition.releaseState === 'design'
        ? 'In design'
        : 'Planned';

  const contents = (
    <>
      <span className="flex size-10 items-center justify-center rounded-md bg-[var(--surface-sunken)] text-[var(--brand)]">
        <Icon className="size-[18px]" strokeWidth={1.8} />
      </span>
      <span className="mt-auto block">
        <span className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span
            className={`size-1.5 rounded-full ${
              agent?.status === 'active'
                ? 'bg-emerald-500'
                : definition.releaseState === 'released'
                  ? 'bg-[var(--brand)]'
                  : 'bg-ink-300 dark:bg-ink-600'
            }`}
          />
          {state}
        </span>
        <span className="block text-[17px] font-semibold tracking-[-0.025em] text-foreground">
          {definition.name}
        </span>
        <span className="mt-1.5 block text-[13px] leading-5 text-muted-foreground">
          {agent ? 'Open workspace' : definition.description}
        </span>
      </span>
    </>
  );

  const className =
    'group flex aspect-square min-h-56 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)] hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2';

  if (agent) {
    return (
      <Link href={`/agents/${agent.id}`} className={className} aria-label={`Open ${definition.name}`}>
        {contents}
      </Link>
    );
  }

  if (definition.releaseState === 'released') {
    return (
      <button
        type="button"
        className={className}
        disabled={creating}
        onClick={onCreate}
        aria-label={`Create ${definition.name}`}
      >
        {contents}
      </button>
    );
  }

  return (
    <div
      className="flex aspect-square min-h-56 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 opacity-70"
      aria-label={`${definition.name}: ${state}`}
    >
      {contents}
    </div>
  );
}

function AgentCatalogSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading agents">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="aspect-square min-h-56 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]"
        />
      ))}
    </div>
  );
}
