'use client';

import { useMemo, useState } from 'react';
import type { Agent, WebDeploymentPolicy, WebSurfaceRule } from '@voomate/core';
import { isPathWithinPrefix, webDeploymentPolicyFromAppearance } from '@voomate/core';
import { CircleAlert, Globe2, RefreshCw, Route, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiAction, useApiQuery } from '@/lib/hooks';

type DiscoveredPage = {
  pathname: string;
  name: string | null;
  source: string;
  lastSeenAt: string;
};
type DiscoveredLocation = {
  origin: string;
  verification: 'pending' | 'verified';
  enabled: boolean;
  identity: 'anonymous' | 'required';
  lastSeenAt: string;
  pages: DiscoveredPage[];
};
type Props = { agent: Agent; onChanged: () => void; embedded?: boolean };

export function WebAgentPlacement({ agent, onChanged, embedded = false }: Props) {
  const browserOrigin = typeof window === 'undefined' ? undefined : window.location.origin;
  const discovery = useApiQuery<{ locations: DiscoveredLocation[] }>(
    `/v1/agents/${agent.id}/web-locations`,
    { pollMs: 2_000 },
  );
  const policy = useMemo(() => {
    const base = editablePolicy(agent, browserOrigin);
    // A saved origin is configuration, not installation evidence. Only a domain that the SDK
    // has actually reported and the merchant server has verified may appear as a usable site.
    // This prevents old test settings or manual database values from looking like a live SDK.
    const verifiedLocations = (discovery.data?.locations ?? []).filter(
      (location) => location.verification === 'verified',
    );
    const verifiedOrigins = new Set(verifiedLocations.map((location) => location.origin));
    const existing = base.surfaces.filter((surface) => verifiedOrigins.has(surface.origin));
    const missing = verifiedLocations.filter(
      (location) => !existing.some((surface) => surface.origin === location.origin),
    );
    return {
      ...base,
      surfaces: [
        ...existing,
        ...missing.map((location, index) => ({
          id: `observed_ui_${index + 1}`,
          name: new URL(location.origin).hostname,
          kind: 'observed' as const,
          origin: location.origin,
          pathPrefixes: ['/'],
          excludedPathPrefixes: [],
          identity: location.identity,
          // Domain discovery never turns an agent on. The merchant explicitly enables a
          // verified surface after reviewing it.
          enabled: false,
        })),
      ],
    };
  }, [agent, browserOrigin, discovery.data?.locations]);
  const save = useApiAction(async (auth, next: WebDeploymentPolicy) => {
    // Keep detected origins bound to this tenant so an off surface stays observable, while the
    // path policy remains the final runtime authorization gate.
    const allowedOrigins = Array.from(new Set(next.surfaces.map((surface) => surface.origin)));
    await api.patch(
      `/v1/agents/${agent.id}`,
      { allowedOrigins, appearance: { webDeployment: next } },
      auth,
    );
    window.dispatchEvent(new Event('voomate:agent-configuration-updated'));
    onChanged();
  });
  const scan = useApiAction(async (auth, origin: string) => {
    await api.post(`/v1/agents/${agent.id}/web-locations/scan`, { origin }, auth);
    await discovery.refetch();
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

  const setIdentity = (id: string, identity: 'anonymous' | 'required') => {
    const next = {
      ...policy,
      surfaces: policy.surfaces.map((surface) =>
        surface.id === id ? { ...surface, identity } : surface,
      ),
    };
    void save.run(next);
  };

  const setDetectedDomainsEnabled = (enabled: boolean) => {
    const detectedOrigins = new Set(
      (discovery.data?.locations ?? []).map((location) => location.origin),
    );
    const next = {
      ...policy,
      surfaces: policy.surfaces.map((surface) =>
        detectedOrigins.has(surface.origin) ? { ...surface, enabled } : surface,
      ),
    };
    void save.run(next);
  };
  const detectedSurfaceCount = policy.surfaces.filter((surface) =>
    (discovery.data?.locations ?? []).some((location) => location.origin === surface.origin),
  ).length;
  const allDetectedDomainsEnabled =
    detectedSurfaceCount > 0 &&
    policy.surfaces
      .filter((surface) =>
        (discovery.data?.locations ?? []).some((location) => location.origin === surface.origin),
      )
      .every((surface) => surface.enabled);
  const pendingLocations = (discovery.data?.locations ?? []).filter(
    (location) => location.verification === 'pending',
  );

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

  return (
    <section
      className={cn(
        !embedded &&
          'mt-6 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-5 sm:p-6',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {!embedded && (
            <p className="text-[16px] font-semibold text-foreground">Where {agent.name} can help</p>
          )}
          <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted-foreground">
            Only sites reported by the installed SDK appear here. Your server then verifies that
            exact site. Voomate never discovers or runs on admin, sign-in, payment, or private
            pages unless the merchant deliberately installs it there.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {detectedSurfaceCount > 0 && (
            <button
              type="button"
              disabled={save.busy}
              onClick={() => setDetectedDomainsEnabled(!allDetectedDomainsEnabled)}
              className="min-h-8 rounded-md border border-[var(--border-default)] bg-[var(--surface)] px-2.5 text-[10.5px] font-semibold text-foreground transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50"
            >
              {allDetectedDomainsEnabled
                ? 'Block all detected domains'
                : 'Turn on all detected domains'}
            </button>
          )}
          <span className="inline-flex w-fit items-center gap-2 rounded-md bg-[var(--surface-soft)] px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Tenant-controlled access
          </span>
        </div>
      </div>

      {policy.surfaces.length === 0 && pendingLocations.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-soft)] p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-muted-foreground">
            <Globe2 className="size-4" />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold text-foreground">
              Waiting for the first live connection
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Publish the setup and open the site once. The exact domain appears automatically.
            </p>
          </div>
        </div>
      ) : policy.surfaces.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {policy.surfaces.map((surface) => (
            <SurfaceRow
              key={surface.id}
              surface={surface}
              location={discovery.data?.locations.find(
                (location) => location.origin === surface.origin,
              )}
              busy={save.busy || scan.busy}
              onToggle={(enabled) => setEnabled(surface.id, enabled)}
              onIdentityChange={(identity) => setIdentity(surface.id, identity)}
              onAddExclusion={(path) => addExclusion(surface.id, path)}
              onRemoveExclusion={(path) => removeExclusion(surface.id, path)}
              onScan={() => scan.run(surface.origin)}
            />
          ))}
        </div>
      ) : null}
      {pendingLocations.length > 0 && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {pendingLocations.map((location) => (
            <article
              key={location.origin}
              className="min-w-0 rounded-lg border border-caution/25 bg-caution-soft p-4"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--surface)] text-caution">
                  <CircleAlert className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">SDK detected</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {location.origin}
                  </p>
                  <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
                    The browser script is working, but this domain remains blocked until the
                    same site&apos;s server uses the API key at <code>/voomate/setup</code>. This
                    dashboard updates automatically when that verification succeeds.
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {discovery.loading && (
        <p className="mt-3 text-[11px] text-muted-foreground">Checking live route evidence…</p>
      )}
      {discovery.error && (
        <p className="mt-3 text-[12px] text-critical">
          Could not load detected pages. {discovery.error}
        </p>
      )}
      {save.error && <p className="mt-2 text-[12px] text-critical">{save.error}</p>}
      {scan.error && <p className="mt-2 text-[12px] text-critical">{scan.error}</p>}
    </section>
  );
}

function SurfaceRow({
  surface,
  location,
  busy,
  onToggle,
  onIdentityChange,
  onAddExclusion,
  onRemoveExclusion,
  onScan,
}: {
  surface: WebSurfaceRule;
  location: DiscoveredLocation | undefined;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
  onIdentityChange: (identity: 'anonymous' | 'required') => void;
  onAddExclusion: (path: string) => void;
  onRemoveExclusion: (path: string) => void;
  onScan: () => void;
}) {
  const Icon = Globe2;
  const pages = location?.pages ?? [];
  const [showAllPages, setShowAllPages] = useState(false);
  const visiblePages = showAllPages ? pages : pages.slice(0, 12);
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
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border-default)] pt-3">
        <button
          type="button"
          disabled={busy || location === undefined}
          onClick={onScan}
          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-[var(--surface)] px-2 text-[10.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          title={
            location
              ? 'Scan this verified domain’s public sitemap and linked pages'
              : 'This domain can be scanned after the SDK has verified it with your server'
          }
        >
          <RefreshCw className="size-3" /> Scan public routes
        </button>
        <button
          type="button"
          aria-pressed={surface.identity === 'required'}
          aria-label={`${surface.identity === 'required' ? 'Allow anonymous visitors on' : 'Require signed-in identity on'} ${surface.name}`}
          disabled={busy}
          onClick={() =>
            onIdentityChange(surface.identity === 'required' ? 'anonymous' : 'required')
          }
          className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[10.5px] font-semibold transition-colors disabled:opacity-50 ${
            surface.identity === 'required'
              ? 'border-accent-500/30 bg-accent-50 text-accent-700'
              : 'border-[var(--border-default)] bg-[var(--surface)] text-muted-foreground hover:text-foreground'
          }`}
          title={
            surface.identity === 'required'
              ? 'Only customers verified by your server can use the agent here'
              : 'Visitors can use the agent without signing in'
          }
        >
          <ShieldCheck className="size-3" />
          {surface.identity === 'required' ? 'Signed-in users' : 'Public visitors'}
        </button>
      </div>
      {pages.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--surface)]">
          {visiblePages.map((page) => {
            const enabled = !surface.excludedPathPrefixes.some((prefix) =>
              isPathWithinPrefix(page.pathname, prefix),
            );
            return (
              <div
                key={page.pathname}
                className="flex min-h-10 items-center gap-2 border-b border-[var(--border-default)] px-3 last:border-b-0"
              >
                <Route className="size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[10.5px] text-foreground">
                    {page.pathname}
                  </p>
                  {page.name && page.name !== page.pathname && (
                    <p className="truncate text-[9.5px] text-muted-foreground">{page.name}</p>
                  )}
                  <p className="mt-0.5 text-[9px] font-medium text-muted-foreground">
                    {page.source === 'crawl'
                      ? 'Public scan'
                      : page.source === 'manifest'
                        ? 'Router manifest'
                        : 'Live SDK'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-pressed={enabled}
                  aria-label={`${enabled ? 'Turn off' : 'Turn on'} ${page.pathname}`}
                  disabled={busy}
                  onClick={() =>
                    enabled
                      ? onAddExclusion(page.pathname)
                      : onRemoveExclusion(
                          surface.excludedPathPrefixes.find((prefix) =>
                            isPathWithinPrefix(page.pathname, prefix),
                          ) ?? normalisePath(page.pathname),
                        )
                  }
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-md border text-[9px] font-semibold disabled:opacity-50',
                    enabled
                      ? 'border-positive/25 bg-positive-soft text-positive'
                      : 'border-[var(--border-default)] bg-[var(--surface-soft)] text-muted-foreground',
                  )}
                >
                  {enabled ? 'On' : 'Off'}
                </button>
              </div>
            );
          })}
          {pages.length > visiblePages.length && (
            <button
              type="button"
              onClick={() => setShowAllPages(true)}
              className="w-full border-t border-[var(--border-default)] px-3 py-2 text-left text-[10.5px] font-semibold text-accent-700 hover:bg-[var(--surface-soft)]"
            >
              Show all {pages.length} detected routes
            </button>
          )}
        </div>
      )}
      {surface.excludedPathPrefixes.some(
        (path) => !pages.some((page) => normalisePath(page.pathname) === normalisePath(path)),
      ) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {surface.excludedPathPrefixes
            .filter(
              (path) => !pages.some((page) => normalisePath(page.pathname) === normalisePath(path)),
            )
            .map((path) => (
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

function normalisePath(value: string): string {
  const trimmed = value.trim().replace(/\/+/g, '/');
  if (!trimmed || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}
