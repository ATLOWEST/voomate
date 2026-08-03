'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Agent } from '@soniq/core';
import { PageBody, PageHeader } from '@/components/shell/page-header';
import { Badge, StatusDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Dialog, DialogActions } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, TextInput } from '@/components/ui/field';
import { Panel } from '@/components/ui/panel';
import { api } from '@/lib/api';
import { useApiAction, useApiQuery } from '@/lib/hooks';
import { useSession } from '@/lib/session';

export function AgentsList() {
  const { organization } = useSession();
  const { data, error, loading, refetch } = useApiQuery<{ agents: Agent[] }>(
    organization === undefined ? null : '/v1/agents',
  );
  const [creating, setCreating] = useState(false);

  const agents = data?.agents ?? [];

  return (
    <>
      <PageHeader
        title="Agents"
        description="Each agent has its own knowledge base, voice, and embed key. Most merchants need one; run separate agents when you have separate sites or separate audiences."
        action={
          <Button
            variant="primary"
            disabled={organization === undefined}
            onClick={() => setCreating(true)}
          >
            New agent
          </Button>
        }
      />
      <PageBody>
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
          <Panel>
            {loading ? (
              <ListSkeleton />
            ) : agents.length === 0 ? (
              <EmptyState
                title="No agents yet"
                description="Point an agent at your website, add what it should know, and try it in the playground before it ever talks to a visitor."
                action={
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    Create your first agent
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-[var(--border-default)]">
                {agents.map((agent) => (
                  <li key={agent.id}>
                    <Link
                      href={`/agents/${agent.id}`}
                      className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <StatusDot tone={agent.status === 'published' ? 'positive' : 'caution'} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium">{agent.name}</div>
                        <div className="truncate text-[12.5px] text-muted">{agent.websiteUrl}</div>
                      </div>
                      {agent.voiceEnabled && <Badge tone="accent">Voice</Badge>}
                      <Badge tone={agent.status === 'published' ? 'positive' : 'caution'}>
                        {agent.status}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </PageBody>

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
    <ul className="divide-y divide-[var(--border-default)]">
      {[0, 1, 2].map((row) => (
        <li key={row} className="flex items-center gap-4 px-6 py-4">
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
