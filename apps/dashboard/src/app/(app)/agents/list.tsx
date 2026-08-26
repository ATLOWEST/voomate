'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AGENT_CATALOG, type Agent, type AgentCatalogType } from '@voomate/core';
import { DatabaseZap, Globe2, PhoneCall, Plus, Search, type LucideIcon } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Dialog } from '@/components/ui/dialog';
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
  const [catalogOpen, setCatalogOpen] = useState(false);
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
  const visibleAgents = AGENT_CATALOG.flatMap((definition) => {
    const agent = agentsByType.get(definition.id);
    return agent && agent.status !== 'archived' ? [{ definition, agent }] : [];
  });

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
        description="Manage the agents this workspace has added."
        action={
          <Button
            variant="primary"
            icon={<Plus className="size-4" />}
            disabled={organization === undefined}
            onClick={() => setCatalogOpen(true)}
          >
            Add agent
          </Button>
        }
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
            {visibleAgents.length > 0 ? (
              <section aria-label="Added agents" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleAgents.map(({ definition, agent }) => (
                  <AgentTile
                    key={definition.id}
                    definition={definition}
                    agent={agent}
                  />
                ))}
              </section>
            ) : (
              <section className="rounded-xl bg-[var(--surface-soft)] px-6 py-12 sm:px-10">
                <p className="text-[17px] font-semibold text-foreground">No agents added</p>
                <p className="mt-2 max-w-md text-[13px] leading-5 text-muted-foreground">
                  Add the first capability your workspace needs. You can configure it before it
                  is allowed to go live.
                </p>
                <Button
                  className="mt-6"
                  variant="primary"
                  icon={<Plus className="size-4" />}
                  onClick={() => setCatalogOpen(true)}
                >
                  Add agent
                </Button>
              </section>
            )}
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

      {catalogOpen && (
        <AgentCatalogDialog
          agentsByType={agentsByType}
          busy={creating}
          onClose={() => setCatalogOpen(false)}
          onAdd={(catalogType) => void createAgent(catalogType)}
        />
      )}
    </>
  );
}

function AgentTile({
  definition,
  agent,
}: {
  definition: (typeof AGENT_CATALOG)[number];
  agent: Agent;
}) {
  const Icon = catalogIcons[definition.id];
  const state =
    agent.status === 'active'
      ? 'Live'
      : agent.status === 'paused'
        ? 'Paused'
        : agent.status === 'archived'
          ? 'Archived'
          : 'Setup';

  const contents = (
    <>
      <span className="flex size-10 items-center justify-center rounded-md bg-[var(--surface-sunken)] text-[var(--brand)]">
        <Icon className="size-[18px]" strokeWidth={1.8} />
      </span>
      <span className="mt-auto block">
        <span className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span
            className={`size-1.5 rounded-full ${
              agent.status === 'active'
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
          Open workspace
        </span>
      </span>
    </>
  );

  const className =
    'group flex aspect-square min-h-56 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)] hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2';

  return (
    <Link
      href={`/agents/${agent.id}`}
      className={className}
      aria-label={`Open ${definition.name}`}
    >
      {contents}
    </Link>
  );
}

function AgentCatalogDialog({
  agentsByType,
  busy,
  onClose,
  onAdd,
}: {
  agentsByType: Map<AgentCatalogType, Agent>;
  busy: boolean;
  onClose: () => void;
  onAdd: (catalogType: AgentCatalogType) => void;
}) {
  return (
    <Dialog
      title="Add an agent"
      description="Choose the capability you want to add. Each type can be added once in this workspace."
      onClose={onClose}
      wide
    >
      <div className="space-y-2">
        {AGENT_CATALOG.map((definition) => {
          const Icon = catalogIcons[definition.id];
          const existing = agentsByType.get(definition.id);
          const released = definition.releaseState === 'released';
          return (
            <div
              className="flex items-center gap-3 rounded-lg bg-[var(--surface-sunken)] p-3.5"
              key={definition.id}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-background text-[var(--brand)]">
                <Icon className="size-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-foreground">{definition.name}</p>
                <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">
                  {definition.description}
                </p>
              </div>
              {existing ? (
                <Link
                  href={`/agents/${existing.id}`}
                  onClick={onClose}
                  className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-background px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-[var(--surface-hover)]"
                >
                  Added
                </Link>
              ) : released ? (
                <Button size="sm" variant="primary" loading={busy} onClick={() => onAdd(definition.id)}>
                  Add
                </Button>
              ) : (
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                  {definition.releaseState === 'design' ? 'In design' : 'Planned'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Dialog>
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
