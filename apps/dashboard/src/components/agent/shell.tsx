'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Agent } from '@voomate/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  ChevronLeft,
  FlaskConical,
  Globe2,
  LayoutDashboard,
  Power,
  Settings,
} from 'lucide-react';
import { api } from '@/lib/api';
import { messageFor, useApiQuery } from '@/lib/hooks';
import { useApiAuth, useSession } from '@/lib/session';
import { cn } from '@/lib/cn';
import { Callout } from '@/components/ui/callout';

interface AgentContextValue {
  agent: Agent;
  isPlaceholder: boolean;
  refresh: () => void;
  deployment: AgentDeployment;
  refreshDeployment: () => void;
}

export interface AgentDeployment {
  platform: 'web' | null;
  supported: boolean;
  /** The SDK executed with this agent's unique public installation ID. */
  observed: boolean;
  observedOrigin: string | null;
  observedPathname: string | null;
  observedAt: string | null;
  /** A server-only API key claim is required before an observed origin can run the agent. */
  verified: boolean;
  verifiedOrigin: string | null;
  verifiedPathname: string | null;
  verifiedAt: string | null;
  sdkVersion: string | null;
}

const EMPTY_DEPLOYMENT: AgentDeployment = {
  platform: null,
  supported: false,
  observed: false,
  observedOrigin: null,
  observedPathname: null,
  observedAt: null,
  verified: false,
  verifiedOrigin: null,
  verifiedPathname: null,
  verifiedAt: null,
  sdkVersion: null,
};

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
    organization === undefined || isFixedSlot ? null : '/v1/agents/' + agentId,
    { pollMs: 2_000 },
  );
  const {
    data: webAgentsData,
    loading: loadingWebAgents,
    refetch: refreshWebAgents,
  } = useApiQuery<{ agents: Agent[] }>(
    organization === undefined || agentId !== 'web' ? null : '/v1/agents',
  );
  const { data: deploymentData, refetch: refreshDeployment } = useApiQuery<{
    deployment: AgentDeployment;
  }>(organization === undefined || isFixedSlot ? null : `/v1/agents/${agentId}/deployment`, {
    pollMs: 3_000,
  });

  const value = useMemo<AgentContextValue | undefined>(() => {
    if (agentId === 'web' && webAgentsData?.agents[0] !== undefined) {
      return {
        agent: webAgentsData.agents[0],
        isPlaceholder: false,
        refresh: refreshWebAgents,
        deployment: EMPTY_DEPLOYMENT,
        refreshDeployment,
      };
    }

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
          websiteUrl: '',
          allowedOrigins: [],
          embedKey: '',
          voiceEnabled: agentId !== 'integration',
          retainAudio: false,
          transcriptRetentionDays: 30,
        } as unknown as Agent,
        isPlaceholder: true,
        refresh: () => {},
        deployment: EMPTY_DEPLOYMENT,
        refreshDeployment: () => {},
      };
    }

    return data === undefined
      ? undefined
      : {
          agent: data.agent,
          isPlaceholder: false,
          refresh,
          deployment: deploymentData?.deployment ?? EMPTY_DEPLOYMENT,
          refreshDeployment,
        };
  }, [
    agentId,
    data,
    deploymentData,
    isFixedSlot,
    organization?.id,
    refresh,
    refreshDeployment,
    refreshWebAgents,
    webAgentsData,
  ]);

  if ((loading && !isFixedSlot) || (agentId === 'web' && loadingWebAgents)) {
    return <ShellSkeleton />;
  }

  if (value === undefined) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
        <h1 className="text-xl font-semibold text-foreground">Agent unavailable</h1>
        <div className="mt-5">
          <Callout tone="critical" title="This agent could not be loaded">
            {error ??
              'It may have been deleted or belong to another workspace. Check your current workspace.'}
          </Callout>
        </div>
      </main>
    );
  }

  return (
    <AgentContext.Provider value={value}>
      <div className="min-h-full bg-background">
        <AgentHeader
          agent={value.agent}
          deployment={value.deployment}
          isPlaceholder={value.isPlaceholder}
          onChanged={value.refresh}
        />
        <div className="mx-auto w-full max-w-[1240px] px-5 pb-12 sm:px-8 lg:px-10">{children}</div>
      </div>
    </AgentContext.Provider>
  );
}

function AgentNav({ agentId, isPlaceholder }: { agentId: string; isPlaceholder: boolean }) {
  const pathname = usePathname();
  const basePath = '/agents/' + agentId;

  if (isPlaceholder) {
    return (
      <Link
        href="/agents"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-[var(--surface-sunken)] hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to agents
      </Link>
    );
  }

  const items = [
    { name: 'Info', href: basePath, icon: LayoutDashboard },
    { name: 'Setup', href: basePath + '/install', icon: Globe2 },
    { name: 'Test', href: basePath + '/playground', icon: FlaskConical },
    { name: 'Settings', href: basePath + '/configuration', icon: Settings },
  ];

  return (
    <nav
      className="agent-tab-rail flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg bg-[var(--surface-soft)] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Agent sections"
    >
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            href={item.href}
            key={item.name}
            aria-current={active ? 'page' : undefined}
            data-active={active}
            className={cn(
              'agent-tab group inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-[12.5px] font-medium transition-[background-color,color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:translate-y-px',
              active
                ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(20,20,18,0.05),0_5px_14px_rgba(20,20,18,0.05)] dark:bg-white/[0.08] dark:shadow-none'
                : 'text-muted-foreground hover:-translate-y-0.5 hover:bg-white/70 hover:text-foreground dark:hover:bg-white/[0.045]',
            )}
          >
            <span
              className={cn(
                'grid size-6 place-items-center rounded-md transition-[background-color,color,transform] duration-500 group-hover:scale-105',
                active
                  ? 'bg-accent-100 text-accent-700 dark:bg-accent-950/55 dark:text-accent-200'
                  : 'text-muted-foreground',
              )}
            >
              <Icon className="size-3.5" strokeWidth={1.8} />
            </span>
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

function AgentHeader({
  agent,
  deployment,
  isPlaceholder,
  onChanged,
}: {
  agent: Agent;
  deployment: AgentDeployment;
  isPlaceholder: boolean;
  onChanged: () => void;
}) {
  const auth = useApiAuth();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(agent.name);
  const [optimisticStatus, setOptimisticStatus] = useState(agent.status);

  useEffect(() => {
    setEditName(agent.name);
    setOptimisticStatus(agent.status);
  }, [agent.name, agent.status]);

  const publish = async () => {
    setBusy(true);
    setProblem(undefined);
    try {
      const { accessToken, organizationId } = await auth();
      await api.post('/v1/agents/' + agent.id + '/activate', undefined, {
        accessToken,
        organizationId,
      });
      setOptimisticStatus('active');
      onChanged();
      window.dispatchEvent(new Event('voomate:agent-configuration-updated'));
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
      await api.post('/v1/agents/' + agent.id + '/' + (resuming ? 'resume' : 'pause'), undefined, {
        accessToken,
        organizationId,
      });
      setOptimisticStatus(resuming ? 'active' : 'paused');
      onChanged();
      window.dispatchEvent(new Event('voomate:agent-configuration-updated'));
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
        '/v1/agents/' + agent.id,
        { name: editName.trim() },
        { accessToken, organizationId },
      );
      onChanged();
    } catch (caught) {
      setEditName(agent.name);
      setProblem(messageFor(caught));
    }
  };

  const statusLabel =
    optimisticStatus === 'active'
      ? 'Live'
      : optimisticStatus === 'paused'
        ? 'Paused'
        : optimisticStatus === 'archived'
          ? 'Archived'
          : 'Draft';

  return (
    <header className="mx-auto w-full max-w-[1240px] px-5 pb-6 pt-4 sm:px-8 sm:pt-7 lg:px-10">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {!isPlaceholder && (
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--surface-sunken)] text-foreground">
                <Bot className="size-[18px]" strokeWidth={1.8} />
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                {isEditingName ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    onBlur={() => void saveName()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void saveName();
                      if (event.key === 'Escape') {
                        setEditName(agent.name);
                        setIsEditingName(false);
                      }
                    }}
                    autoFocus
                    className="h-9 max-w-64 rounded-lg bg-[var(--surface-sunken)] px-2.5 text-[17px] font-semibold text-foreground outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => !isPlaceholder && setIsEditingName(true)}
                    className={cn(
                      'truncate text-left text-[18px] font-semibold text-foreground transition-opacity',
                      !isPlaceholder && 'hover:opacity-70',
                    )}
                    title={isPlaceholder ? undefined : 'Rename agent'}
                    disabled={isPlaceholder}
                  >
                    {editName}
                  </button>
                )}
                {!isPlaceholder && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-semibold',
                      optimisticStatus === 'active'
                        ? 'bg-positive-soft text-positive dark:bg-emerald-950/35'
                        : optimisticStatus === 'paused'
                          ? 'bg-caution-soft text-caution dark:bg-amber-950/35'
                          : 'bg-[var(--surface-sunken)] text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        optimisticStatus === 'active'
                          ? 'bg-positive'
                          : optimisticStatus === 'paused'
                            ? 'bg-caution'
                            : 'bg-ink-400',
                      )}
                    />
                    {statusLabel}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Customer-facing agent</p>
            </div>
          </div>

          {isPlaceholder || optimisticStatus === 'archived' ? null : optimisticStatus ===
            'draft' ? (
            <button
              type="button"
              disabled={busy || !deployment.supported || !deployment.verified}
              onClick={() => void publish()}
              className="grid size-11 shrink-0 place-items-center rounded-lg bg-foreground text-background transition-[opacity,transform] duration-200 hover:opacity-90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Turn on agent"
              title={
                deployment.verified
                  ? 'Turn on agent'
                  : 'Complete and verify installation before turning on this agent'
              }
            >
              <Power className={`size-[18px] ${busy ? 'animate-pulse' : ''}`} strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void togglePause()}
              className={cn(
                'grid size-11 shrink-0 place-items-center rounded-lg border transition-[background-color,border-color,color,transform] duration-200 active:translate-y-px disabled:opacity-45',
                optimisticStatus === 'active'
                  ? 'border-positive/25 bg-positive-soft text-positive hover:bg-emerald-100 dark:hover:bg-emerald-950/55'
                  : 'border-[var(--border-default)] bg-[var(--surface-sunken)] text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground',
              )}
              aria-pressed={optimisticStatus === 'active'}
              aria-label={optimisticStatus === 'paused' ? 'Turn on agent' : 'Turn off agent'}
              title={optimisticStatus === 'paused' ? 'Turn on agent' : 'Turn off agent'}
            >
              <Power className={`size-[18px] ${busy ? 'animate-pulse' : ''}`} strokeWidth={2} />
            </button>
          )}
        </div>

        <AgentNav agentId={agent.id} isPlaceholder={isPlaceholder} />
      </div>

      {problem !== undefined && (
        <div className="mt-5">
          <Callout tone="caution" title="The agent could not be updated">
            {problem}
          </Callout>
        </div>
      )}
    </header>
  );
}

function ShellSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="h-9 w-52 animate-pulse rounded-lg bg-[var(--surface-sunken)]" />
      <div className="mt-5 h-9 w-80 max-w-full animate-pulse rounded-lg bg-[var(--surface-soft)]" />
    </div>
  );
}
