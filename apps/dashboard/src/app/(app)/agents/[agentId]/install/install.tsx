'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Agent } from '@voomate/core';
import { webDeploymentPolicyFromAppearance } from '@voomate/core';
import {
  Check,
  CheckCircle2,
  CircleDashed,
  Clipboard,
  Code2,
  ExternalLink,
  Globe2,
  LockKeyhole,
  KeyRound,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { useAgent } from '@/components/agent/shell';
import { PageBody } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { messageFor, useApiAction, useApiQuery } from '@/lib/hooks';
import { useApiAuth } from '@/lib/session';
import {
  buildIdentityAssistantPrompt,
  buildIdentityServerExample,
  buildWebAgentAssistantPrompt,
  buildWebAgentSnippet,
  toWebOrigin,
} from '@/lib/web-agent/installer';

const WIDGET_ORIGIN = (
  process.env.NEXT_PUBLIC_WIDGET_ORIGIN ??
  (process.env.NODE_ENV === 'production' ? 'https://app.atlowest.in' : 'http://localhost:3001')
).replace(/\/$/, '');
const CONTROL_PLANE_ORIGIN = (
  process.env.NEXT_PUBLIC_CONTROL_PLANE_ORIGIN ?? 'https://app.atlowest.in/api'
).replace(/\/$/, '');

interface InstallationDiagnostic {
  code:
    'duplicate_sdk' | 'snippet_found' | 'wrong_agent_key' | 'sdk_not_found' | 'site_unreachable';
  message: string;
  checkedUrl: string;
}

export function InstallPanels() {
  const { agent, deployment, refresh, refreshDeployment } = useAgent();
  const [diagnostic, setDiagnostic] = useState<InstallationDiagnostic>();
  const [identityVerified, setIdentityVerified] = useState(false);
  const requiresIdentity = useMemo(
    () =>
      webDeploymentPolicyFromAppearance(agent.appearance, agent.allowedOrigins).surfaces.some(
        (surface) => surface.enabled && surface.identity === 'required',
      ),
    [agent.allowedOrigins, agent.appearance],
  );

  const snippet = useMemo(
    () => buildWebAgentSnippet({ widgetOrigin: WIDGET_ORIGIN, embedKey: agent.embedKey }),
    [agent.embedKey],
  );
  const assistantPrompt = useMemo(
    () =>
      buildWebAgentAssistantPrompt({
        widgetOrigin: WIDGET_ORIGIN,
        embedKey: agent.embedKey,
        agentName: agent.name,
        approvedOrigins: agent.allowedOrigins,
      }),
    [agent.allowedOrigins, agent.embedKey, agent.name],
  );

  const checkInstallation = useApiAction(async (auth) => {
    const result = await api.post<{ diagnostic: InstallationDiagnostic }>(
      `/v1/agents/${agent.id}/setup/diagnose`,
      {},
      auth,
    );
    setDiagnostic(result.diagnostic);
    refreshDeployment();
  });

  return (
    <PageBody>
      <div className="mb-7 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-600">
          Web Agent setup
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
          Add Voomate to your public pages
        </h1>
        <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
          Approve a domain, add one script, then open the published page. Verification happens
          automatically from the real browser connection.
        </p>
      </div>

      <div className="relative space-y-3 before:absolute before:bottom-8 before:left-[17px] before:top-8 before:w-px before:bg-[var(--border-default)]">
        <SetupStep
          number="1"
          title="Choose where it runs"
          description="Websites and browser apps use the same secure SDK."
          complete
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <PlatformCard
              icon={<MonitorSmartphone className="size-4" />}
              title="Website / web app"
              detail="Available now"
              active
            />
            <PlatformCard
              icon={<Smartphone className="size-4" />}
              title="iOS"
              detail="Coming soon"
            />
            <PlatformCard
              icon={<Smartphone className="size-4" />}
              title="Android"
              detail="Coming soon"
            />
          </div>
        </SetupStep>

        <SetupStep
          number="2"
          title="Approve your public domain"
          description="The agent is rejected everywhere else, even if someone copies your script."
          complete={agent.allowedOrigins.length > 0}
        >
          <AllowedOrigins agent={agent} onChanged={refresh} />
        </SetupStep>

        <SetupStep
          number="3"
          title="Install one script"
          description="Paste it once in the shared public layout, or let your coding assistant do it."
        >
          <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[#151513] text-[#f4f1ea]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-[12px] text-white/65">
                <Code2 className="size-3.5" />
                Public layout
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <CopyButton text={snippet} label="Copy code" />
                <CopyButton text={assistantPrompt} label="Copy AI setup prompt" icon="sparkles" />
              </div>
            </div>
            <pre className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-6 sm:px-5">
              <code>
                <span className="text-[#f09a74]">&lt;script</span>
                {'\n  '}
                <span className="text-[#b8b5ad]">src=</span>
                <span className="text-[#b8d9a6]">&quot;{WIDGET_ORIGIN}/embed.js&quot;</span>
                {'\n  '}
                <span className="text-[#b8b5ad]">data-agent=</span>
                <span className="text-[#b8d9a6]">&quot;{agent.embedKey}&quot;</span>
                {'\n  '}
                <span className="text-[#d9c58a]">async</span>
                {'\n'}
                <span className="text-[#f09a74]">&gt;&lt;/script&gt;</span>
              </code>
            </pre>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <SecurityFact icon={<Globe2 className="size-4" />} label="Domain allowlist" />
            <SecurityFact icon={<LockKeyhole className="size-4" />} label="Signed short sessions" />
            <SecurityFact icon={<ShieldCheck className="size-4" />} label="Server rate limits" />
          </div>
          <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
            No private API key is placed in your code. The visible agent ID is public by design and
            only works on approved pages.
          </p>
        </SetupStep>

        <SetupStep
          number="4"
          title="Protect signed-in customer areas"
          description="Optional for public pages. Required when a protected area must know which customer is signed in."
          complete={!requiresIdentity || identityVerified}
        >
          <IdentityVerification
            agent={agent}
            required={requiresIdentity}
            onVerifiedChange={setIdentityVerified}
          />
        </SetupStep>

        <SetupStep
          number="5"
          title="Open your site and verify"
          description="Publish the change, then open one approved public page in a browser."
          complete={deployment.verified}
          last
        >
          <VerificationCard
            verified={deployment.verified}
            origin={deployment.verifiedOrigin}
            pathname={deployment.verifiedPathname}
            verifiedAt={deployment.verifiedAt}
            sdkVersion={deployment.sdkVersion}
            diagnostic={diagnostic}
            error={checkInstallation.error}
            checking={checkInstallation.busy}
            firstOrigin={agent.allowedOrigins[0]}
            onCheck={() => void checkInstallation.run()}
          />
        </SetupStep>
      </div>

      {agent.status !== 'active' && (
        <div className="ml-0 mt-4 rounded-xl border border-caution/25 bg-caution-soft px-4 py-3 text-[13px] leading-5 text-caution sm:ml-[54px]">
          Installation can be verified while this agent is off. It will only answer visitors after
          you finish setup and turn it on.
        </div>
      )}
    </PageBody>
  );
}

function SetupStep({
  number,
  title,
  description,
  complete = false,
  last = false,
  children,
}: {
  number: string;
  title: string;
  description: string;
  complete?: boolean;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="relative grid grid-cols-[34px_minmax(0,1fr)] gap-3">
      <div
        className={cn(
          'relative z-10 grid size-[34px] place-items-center self-start rounded-lg border text-[12px] font-semibold',
          complete
            ? 'border-positive/25 bg-positive-soft text-positive'
            : 'border-[var(--border-default)] bg-background text-muted-foreground',
          last &&
            'after:absolute after:bottom-[-32px] after:left-1/2 after:h-8 after:w-2 after:-translate-x-1/2 after:bg-background',
        )}
      >
        {complete ? <Check className="size-4" strokeWidth={2.3} /> : number}
      </div>
      <div className="min-w-0 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function PlatformCard({
  icon,
  title,
  detail,
  active = false,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-h-20 items-center gap-3 rounded-xl border px-3.5 py-3',
        active
          ? 'border-accent-400 bg-accent-50 text-foreground'
          : 'border-[var(--border-default)] bg-[var(--surface-soft)] text-muted-foreground',
      )}
      aria-disabled={!active}
    >
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-lg',
          active ? 'bg-accent-100 text-accent-700' : 'bg-[var(--surface-sunken)]',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{title}</span>
        <span className="mt-0.5 block text-[11px] opacity-75">{detail}</span>
      </span>
    </div>
  );
}

function AllowedOrigins({ agent, onChanged }: { agent: Agent; onChanged: () => void }) {
  const [draft, setDraft] = useState('');
  const normalizedDraft = toWebOrigin(draft);

  const save = useApiAction(async (auth, origins: string[]) => {
    await api.patch(`/v1/agents/${agent.id}`, { allowedOrigins: origins }, auth);
    onChanged();
  });

  const add = async () => {
    if (normalizedDraft === undefined) return;
    if (agent.allowedOrigins.includes(normalizedDraft)) {
      setDraft('');
      return;
    }
    if (await save.run([...agent.allowedOrigins, normalizedDraft])) setDraft('');
  };

  return (
    <div className="space-y-3">
      {agent.allowedOrigins.length > 0 && (
        <ul className="divide-y divide-[var(--border-default)] overflow-hidden rounded-xl border border-[var(--border-default)]">
          {agent.allowedOrigins.map((origin) => (
            <li key={origin} className="flex min-h-11 items-center gap-3 px-3.5 py-2">
              <Globe2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{origin}</span>
              <Button
                size="sm"
                variant="ghost"
                loading={save.busy}
                onClick={() => {
                  void save.run(agent.allowedOrigins.filter((value) => value !== origin));
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Field
        label={agent.allowedOrigins.length === 0 ? 'Your public domain' : 'Add another domain'}
        htmlFor="origin-new"
        hint="A full page URL is okay—we save only its secure origin."
        error={save.error}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <TextInput
            id="origin-new"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="https://www.example.com"
            onKeyDown={(event) => {
              if (event.key === 'Enter') void add();
            }}
          />
          <Button
            className="sm:shrink-0"
            loading={save.busy}
            disabled={normalizedDraft === undefined}
            onClick={() => void add()}
          >
            Approve domain
          </Button>
        </div>
      </Field>
    </div>
  );
}

interface IdentityKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

function IdentityVerification({
  agent,
  required,
  onVerifiedChange,
}: {
  agent: Agent;
  required: boolean;
  onVerifiedChange: (verified: boolean) => void;
}) {
  const auth = useApiAuth();
  const keys = useApiQuery<{ keys: IdentityKeySummary[] }>(`/v1/agents/${agent.id}/identity-keys`);
  const [secret, setSecret] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    onVerifiedChange(keys.data?.keys.some((key) => key.lastUsedAt !== null) ?? false);
  }, [keys.data?.keys, onVerifiedChange]);
  const serverExample = useMemo(
    () =>
      buildIdentityServerExample({
        controlPlaneOrigin: CONTROL_PLANE_ORIGIN,
        approvedOrigins: agent.allowedOrigins,
      }),
    [agent.allowedOrigins],
  );
  const prompt = useMemo(
    () =>
      buildIdentityAssistantPrompt({
        widgetOrigin: WIDGET_ORIGIN,
        controlPlaneOrigin: CONTROL_PLANE_ORIGIN,
        embedKey: agent.embedKey,
        agentName: agent.name,
        approvedOrigins: agent.allowedOrigins,
      }),
    [agent.allowedOrigins, agent.embedKey, agent.name],
  );

  const createKey = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.post<{ secret: string }>(
        `/v1/agents/${agent.id}/identity-keys`,
        { name: 'Web Agent identity', expiresInDays: 90 },
        await auth(),
      );
      setSecret(result.secret);
      keys.refetch();
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    setBusy(true);
    setError(undefined);
    try {
      await api.delete(`/v1/agents/${agent.id}/identity-keys/${keyId}`, await auth());
      setSecret(undefined);
      keys.refetch();
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex items-start gap-3 rounded-xl border p-3.5',
          required
            ? 'border-accent-400/50 bg-accent-50'
            : 'border-[var(--border-default)] bg-[var(--surface-soft)]',
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-accent-700">
          <KeyRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground">
            {required ? 'Server verification required' : 'Public visitors stay anonymous'}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
            {required
              ? 'Your server proves the signed-in customer. The browser receives only a five-minute, agent-bound token.'
              : 'Turn on “Signed-in users” for a protected area only when the agent needs customer-specific context.'}
          </p>
        </div>
        <span
          className={cn(
            'rounded-md px-2 py-1 text-[10px] font-semibold',
            required ? 'bg-accent-100 text-accent-700' : 'bg-background text-muted-foreground',
          )}
        >
          {required ? 'Required' : 'Optional'}
        </span>
      </div>

      {keys.error ? (
        <p className="rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-[12px] text-muted-foreground">
          Identity keys are available to workspace admins. {keys.error}
        </p>
      ) : (
        <div className="rounded-xl border border-[var(--border-default)] p-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-foreground">Server identity key</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Store it only in your backend secret manager. It is never placed in the SDK.
              </p>
            </div>
            {(keys.data?.keys.length ?? 0) === 0 && (
              <Button loading={busy || keys.loading} onClick={() => void createKey()}>
                Create server key
              </Button>
            )}
          </div>

          {keys.data?.keys.map((key) => (
            <div
              key={key.id}
              className="mt-3 flex flex-col gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[12px] font-semibold text-foreground">
                  {key.keyPrefix}••••••••
                </p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                  {key.lastUsedAt
                    ? `Last used ${formatVerifiedAt(key.lastUsedAt)}`
                    : 'Not used yet'}
                  {key.expiresAt
                    ? ` · Expires ${new Date(key.expiresAt).toLocaleDateString()}`
                    : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                loading={busy}
                onClick={() => void revokeKey(key.id)}
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>
      )}

      {secret && (
        <div className="overflow-hidden rounded-xl border border-caution/30 bg-[#151513] text-[#f4f1ea]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-[12px] font-semibold text-white">Copy this key now</p>
              <p className="mt-0.5 text-[10.5px] text-white/55">It will not be shown again.</p>
            </div>
            <CopyButton text={secret} label="Copy server key" />
          </div>
          <pre className="overflow-x-auto px-4 py-4 font-mono text-[11.5px] text-[#b8d9a6]">
            <code>{secret}</code>
          </pre>
        </div>
      )}

      <details className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-soft)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-[12.5px] font-semibold text-foreground">
          Add customer verification to your server
        </summary>
        <div className="border-t border-[var(--border-default)] p-3">
          <div className="mb-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-background px-3 text-[11.5px] font-medium text-foreground"
              onClick={() => void navigator.clipboard.writeText(serverExample)}
            >
              <Clipboard className="size-3.5" /> Copy server example
            </button>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[11.5px] font-medium text-background"
              onClick={() => void navigator.clipboard.writeText(prompt)}
            >
              <Sparkles className="size-3.5" /> Copy secure AI prompt
            </button>
          </div>
          <pre className="max-h-72 overflow-auto rounded-lg bg-[#151513] p-4 font-mono text-[11px] leading-5 text-[#f4f1ea]">
            <code>{serverExample}</code>
          </pre>
          <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
            The SDK calls your same-origin endpoint with the customer&apos;s existing session. Your
            server—not the browser—selects the user ID and exchanges it for a short-lived token.
          </p>
        </div>
      </details>

      {error && <p className="text-[12px] text-critical">{error}</p>}
    </div>
  );
}

function SecurityFact({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 text-[12px] text-muted-foreground">
      <span className="text-positive">{icon}</span>
      {label}
    </div>
  );
}

function VerificationCard({
  verified,
  origin,
  pathname,
  verifiedAt,
  sdkVersion,
  diagnostic,
  error,
  checking,
  firstOrigin,
  onCheck,
}: {
  verified: boolean;
  origin: string | null;
  pathname: string | null;
  verifiedAt: string | null;
  sdkVersion: string | null;
  diagnostic?: InstallationDiagnostic;
  error?: string;
  checking: boolean;
  firstOrigin?: string;
  onCheck: () => void;
}) {
  if (verified) {
    return (
      <div
        className="flex flex-col items-center rounded-2xl border border-positive/25 bg-positive-soft px-5 py-7 text-center"
        aria-live="polite"
      >
        <span className="grid size-16 place-items-center rounded-2xl bg-positive text-white shadow-[0_10px_30px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="size-9" strokeWidth={2} />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-foreground">Live installation verified</h3>
        <p className="mt-1 max-w-lg text-[13px] leading-5 text-muted-foreground">
          Voomate received a genuine SDK request from an approved public page. This status is
          checked by the server, not set manually.
        </p>
        <div className="mt-4 flex max-w-full flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[11px] text-positive">
          <span className="max-w-full truncate">
            {origin}
            {pathname ?? ''}
          </span>
          {sdkVersion !== null && <span>{sdkVersion}</span>}
          {verifiedAt !== null && <span>{formatVerifiedAt(verifiedAt)}</span>}
        </div>
      </div>
    );
  }

  const found = diagnostic?.code === 'snippet_found';
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-soft)] p-4 sm:flex-row sm:items-center sm:p-5"
      aria-live="polite"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-background text-accent-600">
        <CircleDashed className={cn('size-6', checking && 'animate-spin')} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-semibold text-foreground">
          {found ? 'Script found—open the page once' : 'Waiting for your live site'}
        </h3>
        <p
          className={cn(
            'mt-1 text-[12.5px] leading-5',
            error ? 'text-critical' : 'text-muted-foreground',
          )}
        >
          {error ??
            diagnostic?.message ??
            'After publishing, open an approved public page. This screen checks again automatically every few seconds.'}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {firstOrigin !== undefined && (
          <a
            href={firstOrigin}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9.5 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Open site <ExternalLink className="size-3.5" />
          </a>
        )}
        <Button loading={checking} onClick={onCheck}>
          Check installation
        </Button>
      </div>
    </div>
  );
}

function CopyButton({
  text,
  label,
  icon = 'clipboard',
}: {
  text: string;
  label: string;
  icon?: 'clipboard' | 'sparkles';
}) {
  const [copied, setCopied] = useState(false);
  const Icon = icon === 'sparkles' ? Sparkles : Clipboard;

  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[11.5px] font-medium text-white transition-colors hover:bg-white/15"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function formatVerifiedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Verified now';
  return `Verified ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)}`;
}
