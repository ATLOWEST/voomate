'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AGENT_CATALOG, type Agent, type AgentCatalogType } from '@voomate/core';
import { DatabaseZap, Globe2, PhoneCall, Plus, Search, type LucideIcon } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/shell/page-header';
import { Badge, StatusDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Dialog, DialogActions } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, TextInput } from '@/components/ui/field';
import { api } from '@/lib/api';
import { useApiAction, useApiQuery } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { VoomateOperatingContext } from '@/components/voomate-operating-context';

export function AgentsList() {
  const { organization } = useSession();
  const { data, error, loading, refetch } = useApiQuery<{ agents: Agent[] }>(
    organization === undefined ? null : '/v1/agents',
  );
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const agents = data?.agents ?? [];

  return (
    <>
      <PageHeader
        title="Your agents"
        description="Choose what your business needs, then manage each agent from one place."
        action={
          <Button
            variant="primary"
            disabled={organization === undefined}
            icon={<Plus className="size-4" />}
            onClick={() => setCatalogOpen(true)}
          >
            Add agent
          </Button>
        }
      />
      <PageBody>
        <VoomateOperatingContext agents={data?.agents} />
        {organization === undefined ? (
          <Callout tone="caution" title="No workspace selected">
            Create a workspace from the sidebar before adding an agent.
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
        ) : (
          <section>
            {loading ? (
              <ListSkeleton />
            ) : agents.length === 0 ? (
              <EmptyState
                title="No agents yet"
                description="Point an agent at your website, add what it should know, and try it in the playground before it ever talks to a visitor."
                action={
                  <Button variant="primary" onClick={() => setCatalogOpen(true)}>
                    Browse agent catalog
                  </Button>
                }
              />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {agents.map((agent) => (
                  <li key={agent.id}>
                    <Link
                      href={`/agents/${agent.id}`}
                      className="flex min-h-24 items-center gap-4 rounded-lg bg-[var(--surface-soft)] px-5 py-4 transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--surface-sunken)] active:translate-y-px"
                    >
                      <StatusDot tone={agent.status === 'active' ? 'positive' : 'caution'} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium">{agent.name}</div>
                        <div className="truncate text-[12.5px] text-muted">{agent.websiteUrl}</div>
                      </div>
                      {agent.voiceEnabled && <Badge tone="accent">Voice</Badge>}
                      <Badge tone={agent.status === 'active' ? 'positive' : 'caution'}>
                        {agent.status}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </PageBody>

      {catalogOpen && (
        <AgentCatalogDialog
          onClose={() => setCatalogOpen(false)}
          onAddWebAgent={() => {
            setCatalogOpen(false);
            setCreating(true);
          }}
        />
      )}

      {creating && (
        <CreateAgentDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            refetch();
          }}
        />
      )}
    </>
  );
}

const catalogIcons: Record<AgentCatalogType, LucideIcon> = {
  web: Globe2,
  crm: DatabaseZap,
  seo: Search,
  calling: PhoneCall,
};

const agentCatalog = AGENT_CATALOG.map((definition) => ({
  ...definition,
  icon: catalogIcons[definition.id],
  available: definition.releaseState === 'released',
  status:
    definition.releaseState === 'released'
      ? 'Available'
      : definition.releaseState === 'design'
        ? 'In design'
        : 'Planned',
}));

function AgentCatalogDialog({
  onClose,
  onAddWebAgent,
}: {
  onClose: () => void;
  onAddWebAgent: () => void;
}) {
  return (
    <Dialog
      title="Add an agent"
      description="Agent types become available only after their runtime, permissions, logs, and evaluations are production-ready."
      onClose={onClose}
      wide
    >
      <div className="space-y-2">
        {agentCatalog.map((item) => {
          const Icon = item.icon;
          return (
            <div
              className="flex items-center gap-4 rounded-lg bg-[var(--surface-sunken)] p-4"
              key={item.id}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{item.name}</span>
                  <Badge tone={item.available ? 'positive' : 'neutral'}>{item.status}</Badge>
                </span>
                <span className="mt-1 block text-[13px] leading-5 text-muted-foreground">
                  {item.description}
                </span>
              </span>
              <Button
                size="sm"
                variant={item.available ? 'primary' : 'secondary'}
                disabled={!item.available}
                onClick={item.available ? onAddWebAgent : undefined}
                title={item.available ? `Add ${item.name}` : `${item.name} is not available yet`}
              >
                {item.available ? 'Add' : 'Planned'}
              </Button>
            </div>
          );
        })}
      </div>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function CreateAgentDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const { run, busy, error } = useApiAction(async (auth) => {
    const { agent } = await api.post<{ agent: Agent }>(
      '/v1/agents',
      { name: name.trim(), websiteUrl: normaliseUrl(websiteUrl) },
      auth,
    );
    onCreated();
    // Straight into the agent, because the next step is always "give it something to know".
    // Landing back on an empty list is a dead end the merchant has to work out for themselves.
    router.push(`/agents/${agent.id}`);
  });

  const ready = name.trim().length > 0 && websiteUrl.trim().length > 0;

  return (
    <Dialog
      title="New agent"
      description="We use the website address to set the agent's allowed domain and to seed its knowledge base later."
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field label="Name" htmlFor="agent-name" hint="For your reference — visitors never see it.">
          <TextInput
            id="agent-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Support assistant"
            autoFocus
          />
        </Field>

        <Field
          label="Website"
          htmlFor="agent-url"
          hint="The site this agent represents, e.g. example.com."
          error={error}
        >
          <TextInput
            id="agent-url"
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            placeholder="https://example.com"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && ready) void run();
            }}
          />
        </Field>
      </div>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={busy} disabled={!ready} onClick={() => void run()}>
          Create agent
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Accept what a merchant actually types.
 *
 * People type `example.com`. The contract requires a full URL, and bouncing them back with
 * "must be a valid URL" for a missing `https://` is the kind of friction that makes a product
 * feel hostile. Anything else still fails validation server-side, where it should.
 */
const normaliseUrl = (value: string): string => {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

function ListSkeleton() {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {[0, 1, 2].map((row) => (
        <li
          key={row}
          className="flex min-h-24 items-center gap-4 rounded-lg bg-[var(--surface-soft)] px-5 py-4"
        >
          <div className="size-1.5 rounded-full bg-[var(--surface-sunken)]" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 animate-pulse rounded bg-[var(--surface-sunken)]" />
            <div className="h-3 w-56 animate-pulse rounded bg-[var(--surface-sunken)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
