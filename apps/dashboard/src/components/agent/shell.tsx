'use client';

/**
 * The agent detail shell.
 *
 * Fetches the agent once and shares it with every tab through context. The alternative — each
 * tab fetching its own copy — means five requests for one page view and, worse, tabs that
 * disagree about the agent's status after a publish.
 *
 * It is a client component rather than a server one because the organization ID lives in
 * client state (a user can belong to several, and the switcher changes which one is active
 * without a navigation). The server layout above it has already proven the user is signed in.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Agent } from '@soniq/core';
import { AgentTabs } from '@/components/shell/nav';
import { PageHeader } from '@/components/shell/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { api } from '@/lib/api';
import { messageFor, useApiQuery } from '@/lib/hooks';
import { useApiAuth, useSession } from '@/lib/session';

interface AgentContextValue {
  agent: Agent;
  /** Re-read the agent after a write, so the header and every tab agree. */
  refresh: () => void;
}

const AgentContext = createContext<AgentContextValue | undefined>(undefined);

export function useAgent(): AgentContextValue {
  const value = useContext(AgentContext);
  if (value === undefined) throw new Error('useAgent must be used inside the agent layout.');
  return value;
}

const STATUS_TONE = {
  draft: 'caution',
  published: 'positive',
  paused: 'neutral',
} as const;

export function AgentShell({ agentId, children }: { agentId: string; children: ReactNode }) {
  const { organization } = useSession();
  const {
    data,
    error,
    loading,
    refetch: refresh,
  } = useApiQuery<{ agent: Agent }>(organization === undefined ? null : `/v1/agents/${agentId}`);

  const value = useMemo<AgentContextValue | undefined>(
    () => (data === undefined ? undefined : { agent: data.agent, refresh }),
    [data, refresh],
  );

  if (loading) return <ShellSkeleton />;

  if (value === undefined) {
    return (
      <>
        <PageHeader title="Agent" />
        <div className="mx-auto max-w-5xl px-6 py-6">
          <Callout tone="critical" title="This agent could not be loaded">
            {error ??
              'It may have been deleted, or it may belong to a different workspace. Check the workspace switcher in the sidebar.'}
          </Callout>
        </div>
      </>
    );
  }

  return (
    <AgentContext.Provider value={value}>
      <AgentHeader agent={value.agent} onChanged={refresh} />
      {children}
    </AgentContext.Provider>
  );
}

function AgentHeader({ agent, onChanged }: { agent: Agent; onChanged: () => void }) {
  const auth = useApiAuth();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const publish = async () => {
    setBusy(true);
    setProblem(undefined);
    try {
      const { accessToken, organizationId } = await auth();
      await api.post(`/v1/agents/${agent.id}/publish`, undefined, { accessToken, organizationId });
      onChanged();
    } catch (caught) {
      setProblem(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  const published = agent.status === 'published';

  return (
    <>
      <PageHeader
        title={agent.name}
        description={
          published
            ? `Live on ${hostOf(agent.websiteUrl)}. Changes to knowledge take effect immediately.`
            : `Draft — not yet serving visitors on ${hostOf(agent.websiteUrl)}.`
        }
        action={
          <div className="flex items-center gap-3">
            <Badge tone={STATUS_TONE[agent.status]}>{agent.status}</Badge>
            {!published && (
              <Button variant="primary" loading={busy} onClick={() => void publish()}>
                Publish
              </Button>
            )}
          </div>
        }
        below={<AgentTabs agentId={agent.id} />}
      />
      {problem !== undefined && (
        <div className="mx-auto max-w-5xl px-6 pt-6">
          {/* The common failure here is publishing with an empty knowledge base, which the
              API rejects on purpose. Saying what to do about it is the whole point. */}
          <Callout tone="caution" title="Not ready to publish">
            {problem}
          </Callout>
        </div>
      )}
    </>
  );
}

function ShellSkeleton() {
  return (
    <div className="border-b border-[var(--border-default)] px-6 pt-6 pb-5">
      <div className="h-7 w-48 animate-pulse rounded-md bg-[var(--surface-sunken)]" />
      <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[var(--surface-sunken)]" />
    </div>
  );
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};
