'use client';

import { useMemo, useState } from 'react';
import type { Agent, WebDeploymentPolicy, WebSurfaceRule } from '@voomate/core';
import { webDeploymentPolicyFromAppearance } from '@voomate/core';
import { Globe2, Plus, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useApiAction } from '@/lib/hooks';

type Props = { agent: Agent; onChanged: () => void };

export function WebAgentPlacement({ agent, onChanged }: Props) {
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newPath, setNewPath] = useState('/');
  const browserOrigin = typeof window === 'undefined' ? undefined : window.location.origin;
  const policy = useMemo(() => editablePolicy(agent, browserOrigin), [agent, browserOrigin]);
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

  const addExclusion = (id: string, path: string) => {
    const normalized = normalisePath(path);
    const next = {
      ...policy,
      surfaces: policy.surfaces.map((surface) =>
        surface.id === id && !surface.excludedPathPrefixes.includes(normalized)
          ? { ...surface, excludedPathPrefixes: [...surface.excludedPathPrefixes, normalized] }
          : surface,
      ),
    };
    void save.run(next);
  };

  const removeExclusion = (id: string, path: string) => {
    const next = {
      ...policy,
      surfaces: policy.surfaces.map((surface) =>
        surface.id === id
          ? {
              ...surface,
              excludedPathPrefixes: surface.excludedPathPrefixes.filter((entry) => entry !== path),
            }
          : surface,
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
          kind: 'manual',
          origin,
          pathPrefixes: [pathPrefix],
          excludedPathPrefixes: [],
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
            Your team controls every allowed and excluded path. The SDK can report pages it sees,
            but exact coverage comes from your route manifest or the areas you approve here.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md bg-[var(--surface-soft)] px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Tenant-controlled access
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {policy.surfaces.map((surface) => (
          <SurfaceRow
            key={surface.id}
            surface={surface}
            busy={save.busy}
            onToggle={(enabled) => setEnabled(surface.id, enabled)}
            onAddExclusion={(path) => addExclusion(surface.id, path)}
            onRemoveExclusion={(path) => removeExclusion(surface.id, path)}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-2 rounded-lg bg-[var(--surface-soft)] p-3 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(12rem,1fr)_minmax(6rem,0.45fr)_auto]">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          className="min-h-10 rounded-md border border-[var(--border-default)] bg-[var(--surface)] px-3 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent-500"
          placeholder="Name people recognise"
          aria-label="New area name"
        />
        <input
          value={newUrl}
          onChange={(event) => setNewUrl(event.target.value)}
          className="min-h-10 rounded-md border border-[var(--border-default)] bg-[var(--surface)] px-3 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent-500"
          placeholder="https://your-app.example.com"
          aria-label="New area domain"
        />
        <input
          value={newPath}
          onChange={(event) => setNewPath(event.target.value)}
          className="min-h-10 rounded-md border border-[var(--border-default)] bg-[var(--surface)] px-3 font-mono text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent-500"
          placeholder="/support or /admin"
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
  onAddExclusion,
  onRemoveExclusion,
}: {
  surface: WebSurfaceRule;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
  onAddExclusion: (path: string) => void;
  onRemoveExclusion: (path: string) => void;
}) {
  const [excludedPath, setExcludedPath] = useState('');
  const Icon = Globe2;
  return (
    <article className="min-w-0 rounded-lg bg-[var(--surface-soft)] p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--surface)] text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">{surface.name}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {surface.origin}
            {surface.pathPrefixes.map(normalisePath).join(', ')}
          </p>
          {surface.excludedPathPrefixes.length > 0 && (
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              Except {surface.excludedPathPrefixes.map(normalisePath).join(', ')}
            </p>
          )}
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
      </div>
      <div className="mt-3 flex gap-2 border-t border-[var(--border-default)] pt-3">
        <input
          value={excludedPath}
          onChange={(event) => setExcludedPath(event.target.value)}
          className="min-h-8 min-w-0 flex-1 rounded-md border border-[var(--border-default)] bg-[var(--surface)] px-2 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent-500"
          placeholder="Exclude child path, e.g. /billing"
          aria-label={`Exclude a path from ${surface.name}`}
        />
        <button
          type="button"
          disabled={busy || !excludedPath.trim().startsWith('/')}
          onClick={() => {
            onAddExclusion(excludedPath);
            setExcludedPath('');
          }}
          className="rounded-md border border-[var(--border-default)] px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-45"
        >
          Exclude
        </button>
      </div>
      {surface.excludedPathPrefixes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {surface.excludedPathPrefixes.map((path) => (
            <button
              key={path}
              type="button"
              disabled={busy}
              onClick={() => onRemoveExclusion(path)}
              className="rounded-md bg-[var(--surface)] px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-45"
              title="Remove exclusion"
            >
              {normalisePath(path)} ×
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function editablePolicy(agent: Agent, _dashboardOrigin: string | undefined): WebDeploymentPolicy {
  const base = webDeploymentPolicyFromAppearance(agent.appearance, agent.allowedOrigins);
  // Do not invent product areas such as “merchant dashboard” from Voomate's own routing.
  // A surface is supplied by the merchant's manifest, an observed route, or this explicit form.
  return { version: 1, surfaces: [...base.surfaces] };
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
