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
import type { Agent } from '@voomate/core';
import { api } from '@/lib/api';
import { messageFor, useApiQuery } from '@/lib/hooks';
import { useApiAuth, useSession } from '@/lib/session';
import { useSearchParams } from 'next/navigation';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Callout } from '@/components/ui/callout';

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

export function AgentShell({ agentId, children }: { agentId: string; children: ReactNode }) {
  const { organization } = useSession();
  const isFixedSlot = ['voice', 'web', 'integration'].includes(agentId);
  const {
    data,
    error,
    loading,
    refetch: refresh,
  } = useApiQuery<{ agent: Agent }>(
    organization === undefined || isFixedSlot ? null : `/v1/agents/${agentId}`,
  );

  const value = useMemo<AgentContextValue | undefined>(() => {
    if (isFixedSlot) {
      return {
        agent: {
          id: agentId,
          name:
            agentId === 'voice'
              ? 'Voice Calling Agent'
              : agentId === 'web'
                ? 'Web Agent'
                : 'Integration Hub',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          organizationId: organization?.id || '',
          type: agentId === 'integration' ? 'browser' : 'voice',
        } as unknown as Agent,
        refresh: () => {},
      };
    }
    return data === undefined ? undefined : { agent: data.agent, refresh };
  }, [data, refresh, agentId, isFixedSlot, organization?.id]);

  if (loading && !isFixedSlot) return <ShellSkeleton />;

  if (value === undefined) {
    return (
      <>
        <div className="border-b border-border/50 bg-card px-6 py-8 max-w-[1400px] mx-auto w-full">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Agent Loading Error</h1>
        </div>
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
      <div className="flex flex-col min-h-screen bg-black/[0.02] dark:bg-white/[0.02]">
        <AgentHeader agent={value.agent} onChanged={refresh} />

        <div className="flex-1 w-full max-w-[1400px] mx-auto flex flex-col md:flex-row px-4 md:px-6 py-6 md:py-8 gap-8">
          <AgentSidebar agentId={value.agent.id} />

          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </AgentContext.Provider>
  );
}

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Settings2,
  Book,
  FileText,
  Settings,
  Ticket,
  BarChart2,
} from 'lucide-react';

function AgentSidebar({ agentId }: { agentId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const niche = searchParams.get('niche');
  const basePath = `/agents/${agentId}`;

  const isShopify = agentId === 'web' && niche === 'shopify';

  const navItems = isShopify
    ? [
        {
          name: 'Dashboard',
          href: `${basePath}?niche=shopify`,
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          name: 'AI Brain',
          href: `${basePath}/knowledge?niche=shopify`,
          icon: <Book className="w-4 h-4" />,
        },
        {
          name: 'Conversations',
          href: `${basePath}/conversations?niche=shopify`,
          icon: <MessageSquare className="w-4 h-4" />,
        },
        {
          name: 'Support Tickets',
          href: `${basePath}/tickets?niche=shopify`,
          icon: <Ticket className="w-4 h-4" />,
        },
        {
          name: 'Insights',
          href: `${basePath}/insights?niche=shopify`,
          icon: <BarChart2 className="w-4 h-4" />,
        },
        {
          name: 'Settings',
          href: `${basePath}/settings?niche=shopify`,
          icon: <Settings className="w-4 h-4" />,
        },
      ]
    : [
        { name: 'Overview', href: basePath, icon: <LayoutDashboard className="w-4 h-4" /> },
        ...(agentId !== 'integration'
          ? [
              {
                name: 'Conversations',
                href: `${basePath}/conversations`,
                icon: <MessageSquare className="w-4 h-4" />,
              },
            ]
          : []),
        {
          name: 'Configuration',
          href: `${basePath}/configuration`,
          icon: <Settings2 className="w-4 h-4" />,
        },
        {
          name: 'Knowledge Base',
          href: `${basePath}/knowledge`,
          icon: <Book className="w-4 h-4" />,
        },
        { name: 'Logs', href: `${basePath}/logs`, icon: <FileText className="w-4 h-4" /> },
        { name: 'Settings', href: `${basePath}/settings`, icon: <Settings className="w-4 h-4" /> },
      ];

  return (
    <aside className="w-full md:w-60 shrink-0">
      <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
        {navItems.map((item) => {
          // Note: for shopify tabs, we need to compare ignoring search params, except for the base path
          const isActive = item.href.includes('?')
            ? pathname === item.href.split('?')[0]
            : pathname === item.href || (pathname === basePath && item.name === 'Overview');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-[13.5px] font-medium rounded-lg transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-black/5 dark:bg-white/5 text-foreground font-bold'
                  : 'text-muted-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.03] hover:text-foreground',
              )}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function AgentHeader({ agent, onChanged }: { agent: Agent; onChanged: () => void }) {
  const auth = useApiAuth();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  // Local state for inline editing name
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(agent.name);
  const [optimisticStatus, setOptimisticStatus] = useState(agent.status);

  const searchParams = useSearchParams();
  const isShopify = agent.id === 'web' && searchParams.get('niche') === 'shopify';

  const publish = async () => {
    setBusy(true);
    setProblem(undefined);
    try {
      const { accessToken, organizationId } = await auth();
      await api.post(`/v1/agents/${agent.id}/publish`, undefined, { accessToken, organizationId });
      setOptimisticStatus('published');
      onChanged();
    } catch (caught) {
      setProblem(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  const togglePause = async () => {
    setBusy(true);
    setProblem(undefined);
    try {
      const { accessToken, organizationId } = await auth();
      const resuming = optimisticStatus === 'paused';
      const newStatus = resuming ? 'published' : 'paused';
      await api.post(`/v1/agents/${agent.id}/${resuming ? 'publish' : 'pause'}`, undefined, {
        accessToken,
        organizationId,
      });
      setOptimisticStatus(newStatus);
      onChanged();
    } catch (caught) {
      setProblem(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    setIsEditingName(false);
    if (editName.trim() === agent.name || editName.trim() === '') {
      setEditName(agent.name);
      return;
    }
    try {
      const { accessToken, organizationId } = await auth();
      await api.patch(
        `/v1/agents/${agent.id}`,
        { name: editName.trim() },
        { accessToken, organizationId },
      );
      onChanged();
    } catch (caught) {
      setEditName(agent.name);
      setProblem(messageFor(caught));
    }
  };

  if (isShopify) return null;

  return (
    <div className="border-b border-border/50 bg-card shrink-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6 py-5 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-black dark:bg-white flex items-center justify-center shadow-sm shrink-0">
            <Bot className="w-5 h-5 text-white dark:text-black" strokeWidth={1.5} />
          </div>

          <div>
            <div className="flex items-center gap-3 mb-0.5">
              {isEditingName ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  autoFocus
                  className="text-lg font-bold tracking-tight text-foreground bg-transparent border-b border-[#FF5722] outline-none focus:ring-0 px-0 py-0 h-[24px] w-full max-w-[200px]"
                />
              ) : (
                <h1
                  className="text-lg font-bold tracking-tight text-foreground cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setIsEditingName(true)}
                  title="Click to edit name"
                >
                  {editName}
                </h1>
              )}

              <div
                className={cn(
                  'px-2 py-0.5 rounded-md border flex items-center justify-center',
                  optimisticStatus === 'published'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : optimisticStatus === 'paused'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-muted border-border/50 text-muted-foreground',
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {optimisticStatus === 'published'
                    ? 'Active'
                    : optimisticStatus === 'paused'
                      ? 'Paused'
                      : 'Draft'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Link
                href="/agents"
                className="hover:text-foreground hover:underline transition-colors"
              >
                Agents
              </Link>
              <span>/</span>
              <span className="font-medium text-foreground">{editName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {optimisticStatus === 'draft' ? (
            <button
              disabled={busy}
              onClick={() => void publish()}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-lg text-[13px] font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {busy ? 'Publishing...' : 'Publish Agent'}
            </button>
          ) : (
            <div className="flex items-center bg-card border border-border/50 rounded-lg p-1 shadow-sm">
              <button
                disabled={busy}
                onClick={togglePause}
                className={cn(
                  'px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 flex items-center gap-2',
                  optimisticStatus === 'paused'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5',
                )}
              >
                Paused
              </button>
              <button
                disabled={busy}
                onClick={togglePause}
                className={cn(
                  'px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 flex items-center gap-2',
                  optimisticStatus === 'published'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5',
                )}
              >
                Active
              </button>
            </div>
          )}
        </div>
      </div>
      {problem !== undefined && (
        <div className="mx-auto max-w-[1400px] w-full px-4 md:px-6 pt-6">
          <Callout tone="caution" title="Error">
            {problem}
          </Callout>
        </div>
      )}
    </div>
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
