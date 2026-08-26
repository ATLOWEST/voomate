'use client';

import { useMemo, useState } from 'react';
import type { Agent, WebDeploymentPolicy, WebSurfaceRule } from '@voomate/core';
import { webDeploymentPolicyFromAppearance } from '@voomate/core';
import { Globe2, LayoutDashboard, LockKeyhole, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useApiAction } from '@/lib/hooks';

type Props = { agent: Agent; onChanged: () => void };

export function WebAgentPlacement({ agent, onChanged }: Props) {
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newPath, setNewPath] = useState('/');
  const browserOrigin = typeof window === 'undefined' ? undefined : window.location.origin;
  const policy = useMemo(
    () => editablePolicy(agent, browserOrigin),
    [agent, browserOrigin],
  );
  const save = useApiAction(async (auth, next: WebDeploymentPolicy) => {
    const allowedOrigins = Array.from(
      new Set([
        ...agent.allowedOrigins,
        ...next.surfaces.filter((surface) => surface.enabled).map((surface) => surface.origin),
      ]),
    );
    await api.patch(
      `/v1/agents/${agent.id}`,
      { allowedOrigins, appearance: { webDeployment: next } },
      auth,
    );
    window.dispatchEvent(new Event('voomate:agent-configuration-updated'));
    onChanged();
  });

  const setEnabled = (id: string, enabled: boolean) => {
    const next = {
      ...policy,
      surfaces: policy.surfaces.map((surface) =>
        surface.id === id ? { ...surface, enabled } : surface,
      ),
    };
    void save.run(next);
  };

  const addCustom = () => {
    const origin = originFrom(newUrl);
    const name = newName.trim();
    if (!origin || name.length < 2) return;
    const pathPrefix = normalisePath(newPath);
    const next: WebDeploymentPolicy = {
      ...policy,
      surfaces: [
        ...policy.surfaces,
        {
          id: `custom_${Date.now()}`,
          name,
          kind: 'custom',
          origin,
          pathPrefixes: [pathPrefix],
          enabled: true,
        },
      ],
    };
    void save.run(next).then((saved) => {
      if (saved) {
        setNewName('');
        setNewUrl('');
        setNewPath('/');
      }
    });
  };

  return (
    <section className="mt-6 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[16px] font-semibold text-foreground">Where {agent.name} can help</p>
          <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted-foreground">
            Choose the pages where this agent is useful. Voomate reads only the visible page context
            on these approved areas; it does not scan your codebase or other portals.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md bg-[var(--surface-soft)] px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground">
          <LockKeyhole className="size-3.5" /> Super Admin excluded
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {policy.surfaces.map((surface) => (
          <SurfaceRow
            key={surface.id}
            surface={surface}
            busy={save.busy}
            onToggle={(enabled) => setEnabled(surface.id, enabled)}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-2 rounded-lg bg-[var(--surface-soft)] p-3 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(12rem,1fr)_minmax(6rem,0.45fr)_auto]">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          className="min-h-10 rounded-md border border-[var(--border-default)] bg-[var(--surface)] px-3 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent-500"
          placeholder="Area name"
          aria-label="New area name"
        />
        <input
          value={newUrl}
          onChange={(event) => setNewUrl(event.target.value)}
          className="min-h-10 rounded-md border border-[var(--border-default)] bg-[var(--surface)] px-3 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent-500"
          placeholder="https://app.example.com"
          aria-label="New area domain"
        />
        <input
          value={newPath}
          onChange={(event) => setNewPath(event.target.value)}
          className="min-h-10 rounded-md border border-[var(--border-default)] bg-[var(--surface)] px-3 font-mono text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent-500"
          placeholder="/support"
          aria-label="New area path"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={save.busy || !originFrom(newUrl) || newName.trim().length < 2}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-foreground px-3 text-[12px] font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus className="size-3.5" /> Add area
        </button>
      </div>
      {save.error && <p className="mt-2 text-[12px] text-critical">{save.error}</p>}
    </section>
  );
}

function SurfaceRow({
  surface,
  busy,
  onToggle,
}: {
  surface: WebSurfaceRule;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const Icon = surface.kind === 'merchant_dashboard' ? LayoutDashboard : Globe2;
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-lg bg-[var(--surface-soft)] p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--surface)] text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{surface.name}</p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {surface.origin}{surface.pathPrefixes.map(normalisePath).join(', ')}
        </p>
      </div>
      <button
        type="button"
        aria-pressed={surface.enabled}
        aria-label={`${surface.enabled ? 'Turn off' : 'Turn on'} ${surface.name}`}
        disabled={busy}
        onClick={() => onToggle(!surface.enabled)}
        className={`grid size-10 shrink-0 place-items-center rounded-md border text-[10px] font-semibold transition-colors disabled:opacity-50 ${
          surface.enabled
            ? 'border-positive/30 bg-positive-soft text-positive'
            : 'border-[var(--border-default)] bg-[var(--surface)] text-muted-foreground hover:text-foreground'
        }`}
      >
        {surface.enabled ? 'On' : 'Off'}
      </button>
    </article>
  );
}

function editablePolicy(agent: Agent, dashboardOrigin: string | undefined): WebDeploymentPolicy {
  const base = webDeploymentPolicyFromAppearance(agent.appearance, agent.allowedOrigins);
  const surfaces = [...base.surfaces];
  const websiteOrigin = originFrom(agent.websiteUrl);

  if (websiteOrigin && !surfaces.some((surface) => surface.kind === 'marketing_site')) {
    const existing = surfaces.find((surface) => surface.origin === websiteOrigin);
    if (existing) {
      Object.assign(existing, { name: 'Marketing pages', kind: 'marketing_site' as const });
    } else {
      surfaces.unshift({
        id: 'marketing',
        name: 'Marketing pages',
        kind: 'marketing_site',
        origin: websiteOrigin,
        pathPrefixes: ['/'],
        enabled: agent.allowedOrigins.includes(websiteOrigin),
      });
    }
  }
  if (dashboardOrigin && !surfaces.some((surface) => surface.kind === 'merchant_dashboard')) {
    const existing = surfaces.find((surface) => surface.origin === dashboardOrigin);
    if (existing) {
      Object.assign(existing, { name: 'Merchant dashboard', kind: 'merchant_dashboard' as const });
    } else {
      surfaces.push({
        id: 'merchant_dashboard',
        name: 'Merchant dashboard',
        kind: 'merchant_dashboard',
        origin: dashboardOrigin,
        pathPrefixes: ['/'],
        enabled: agent.allowedOrigins.includes(dashboardOrigin),
      });
    }
  }
  return { version: 1, surfaces };
}

function originFrom(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

function normalisePath(value: string): string {
  const trimmed = value.trim().replace(/\/+/g, '/');
  if (!trimmed || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}
