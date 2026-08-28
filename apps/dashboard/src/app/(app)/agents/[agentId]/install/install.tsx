'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { Agent } from '@voomate/core';
import {
  Check,
  CircleDashed,
  Clipboard,
  Code2,
  KeyRound,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useAgent } from '@/components/agent/shell';
import { WebAgentPlacement } from '@/components/web-agent/web-agent-placement';
import { PageBody } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogActions } from '@/components/ui/dialog';
import { Field, TextInput } from '@/components/ui/field';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { messageFor, useApiQuery } from '@/lib/hooks';
import { useApiAuth } from '@/lib/session';
import { buildIdentityAssistantPrompt, buildWebAgentSnippet } from '@/lib/web-agent/installer';

const WIDGET_ORIGIN = (
  process.env.NEXT_PUBLIC_WIDGET_ORIGIN ??
  (process.env.NODE_ENV === 'production' ? 'https://app.atlowest.in' : 'http://localhost:3001')
).replace(/\/$/, '');
const CONTROL_PLANE_ORIGIN = (
  process.env.NEXT_PUBLIC_CONTROL_PLANE_ORIGIN ?? 'https://app.atlowest.in/api'
).replace(/\/$/, '');

export function InstallPanels() {
  const { agent, deployment, refresh } = useAgent();
  const snippet = useMemo(
    () => buildWebAgentSnippet({ widgetOrigin: WIDGET_ORIGIN, embedKey: agent.embedKey }),
    [agent.embedKey],
  );
  const assistantPrompt = useMemo(() => {
    const input = {
      widgetOrigin: WIDGET_ORIGIN,
      embedKey: agent.embedKey,
      agentName: agent.name,
      approvedOrigins: agent.allowedOrigins,
    };
    return buildIdentityAssistantPrompt({ ...input, controlPlaneOrigin: CONTROL_PLANE_ORIGIN });
  }, [agent.allowedOrigins, agent.embedKey, agent.name]);
  const sdkConnected = deployment.observed;
  const serverConnected = deployment.verified;
  const agentReady = deployment.verified && agent.status === 'active';

  return (
    <PageBody>
      <div className="mb-7 max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-600">
          Web Agent setup
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
          Get your agent live
        </h1>
        <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
          Send one guided request to your developer or coding assistant, add one private key to
          your hosting service, and Voomate confirms the live connection automatically.
        </p>
      </div>

      <InstallationStatus
        sdkConnected={sdkConnected}
        serverConnected={serverConnected}
        agentReady={agentReady}
      />

      <div className="relative space-y-3 before:absolute before:bottom-8 before:left-[17px] before:top-8 before:w-px before:bg-[var(--border-default)]">
        <SetupStep
          number="1"
          title="Send one setup request"
          description="Copy this and paste it into your coding assistant, or send it to your developer. It explains exactly where Voomate may run and what must stay private."
          complete={sdkConnected}
        >
          <div className="flex flex-col gap-3 rounded-xl bg-[var(--surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">Install Voomate safely</p>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                Your developer adds Voomate only to public customer pages. Admin, sign-in,
                payment, and other sensitive pages remain excluded.
              </p>
            </div>
            <CopyButton text={assistantPrompt} label="Copy setup request" icon="sparkles" prominent />
          </div>
          <details className="mt-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)]">
            <summary className="cursor-pointer list-none px-3.5 py-3 text-[12px] font-semibold text-muted-foreground marker:content-none">
              Need the code instead?
            </summary>
            <div className="border-t border-[var(--border-default)] p-3.5">
              <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Code2 className="size-3.5" /> Public layout</span>
                <CopyButton text={snippet} label="Copy code" />
              </div>
              <pre className="overflow-x-auto rounded-lg bg-[#151513] px-3 py-3 font-mono text-[11px] leading-5 text-[#b8d9a6]"><code>{snippet}</code></pre>
            </div>
          </details>
        </SetupStep>

        <SetupStep
          number="2"
          title="Add your private key"
          description="Create one key and place it in your hosting service. It proves the installed code belongs to your business; it is never added to a browser page."
          complete={serverConnected}
        >
          <IdentityVerification agent={agent} />
        </SetupStep>

        <SetupStep
          number="3"
          title="Voomate connects automatically"
          description="As soon as the deployed site loads Voomate, this page updates by itself. You do not need to refresh this dashboard or type a domain."
          complete={agentReady}
          last
        >
          <WebAgentPlacement agent={agent} onChanged={refresh} embedded />
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

function InstallationStatus({
  sdkConnected,
  serverConnected,
  agentReady,
}: {
  sdkConnected: boolean;
  serverConnected: boolean;
  agentReady: boolean;
}) {
  const states = [
    {
      label: 'Voomate code',
      detail: sdkConnected ? 'Connected' : 'Setup needed',
      complete: sdkConnected,
    },
    {
      label: 'Private connection',
      detail: serverConnected ? 'Verified' : 'Private key needed',
      complete: serverConnected,
    },
    {
      label: 'Agent',
      detail: agentReady ? 'Live' : 'Turn on when ready',
      complete: agentReady,
    },
  ];

  return (
    <section className="mb-5 grid gap-2 sm:grid-cols-3" aria-live="polite">
      {states.map((state) => (
        <div
          key={state.label}
          className={cn(
            'flex items-center gap-3 rounded-xl border px-3.5 py-3',
            state.complete
              ? 'border-positive/25 bg-positive-soft'
              : 'border-critical/25 bg-critical-soft',
          )}
        >
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-lg',
              state.complete ? 'bg-positive text-white' : 'bg-[var(--surface-panel)] text-critical',
            )}
          >
            {state.complete ? <Check className="size-4" /> : <CircleDashed className="size-4" />}
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold text-foreground">{state.label}</span>
            <span className={cn('mt-0.5 block text-[10.5px] font-medium', state.complete ? 'text-positive' : 'text-critical')}>
              {state.detail}
            </span>
          </span>
        </div>
      ))}
    </section>
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

interface IdentityKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

function IdentityVerification({ agent }: { agent: Agent }) {
  const auth = useApiAuth();
  const keys = useApiQuery<{ keys: IdentityKeySummary[] }>(`/v1/agents/${agent.id}/identity-keys`, {
    pollMs: 2_000,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState('Production backend');
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [secret, setSecret] = useState<{ value: string; name: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const createKey = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.post<{ secret: string }>(
        `/v1/agents/${agent.id}/identity-keys`,
        { name: keyName.trim(), expiresInDays },
        await auth(),
      );
      setSecret({ value: result.secret, name: keyName.trim() });
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
      keys.refetch();
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-xl bg-[var(--surface-soft)] p-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-accent-700">
          <KeyRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground">API setup</p>
          <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
            This private key confirms that Voomate is running on your real site. Copy it once into
            your hosting service as <span className="font-mono text-foreground">VOOMATE_API_KEY</span>.
            Your setup request tells your developer exactly where it belongs.
          </p>
        </div>
        <span className="rounded-md bg-positive-soft px-2 py-1 text-[10px] font-semibold text-positive">
          Server only
        </span>
      </div>

      {keys.error ? (
        <p className="rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-[12px] text-muted-foreground">
          API keys are available to workspace admins. {keys.error}
        </p>
      ) : (
        <div className="rounded-xl border border-[var(--border-default)] p-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-foreground">Private keys</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Keep these in your hosting provider only. Never put one in a website page or share
                it in a coding-assistant conversation.
              </p>
            </div>
            <Button
              icon={<Plus className="size-3.5" />}
              disabled={
                (keys.data?.keys.filter(
                  (key) => key.expiresAt === null || new Date(key.expiresAt).getTime() > Date.now(),
                ).length ?? 0) >= 10
              }
              loading={keys.loading}
              onClick={() => {
                setError(undefined);
                setSecret(undefined);
                setDialogOpen(true);
              }}
            >
              Create private key
            </Button>
          </div>

          {(keys.data?.keys.length ?? 0) === 0 && !keys.loading ? (
            <div className="mt-3 rounded-lg bg-[var(--surface-soft)] px-4 py-5 text-center">
              <p className="text-[12.5px] font-medium text-foreground">Create your private key</p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                Create it now, then place it in your hosting service when your developer asks.
              </p>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-[var(--border-default)] overflow-hidden rounded-lg border border-[var(--border-default)]">
              {keys.data?.keys.map((key) => {
                const expired =
                  key.expiresAt !== null && new Date(key.expiresAt).getTime() <= Date.now();
                return (
                  <div
                    key={key.id}
                    className="flex flex-col gap-3 bg-[var(--surface-panel)] px-3.5 py-3 sm:flex-row sm:items-center"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-soft)] text-muted-foreground">
                      <KeyRound className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[12.5px] font-semibold text-foreground">
                          {key.name}
                        </p>
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em]',
                            expired
                              ? 'bg-[var(--surface-soft)] text-muted-foreground'
                              : 'bg-positive-soft text-positive',
                          )}
                        >
                          {expired ? 'Expired' : 'Active'}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {key.keyPrefix}••••••••••••
                      </p>
                      <p className="mt-1 text-[10.5px] text-muted-foreground">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                        {' · '}
                        {key.lastUsedAt ? formatVerifiedAt(key.lastUsedAt) : 'Never used'}
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
                );
              })}
            </div>
          )}
          <p className="mt-2 text-[10.5px] text-muted-foreground">
            Up to 10 active keys. Full values are shown once and cannot be recovered.
          </p>
        </div>
      )}

      {dialogOpen && (
        <Dialog
          title={secret ? 'Save your private key' : 'Create private key'}
          description={
            secret
              ? 'This is the only time the full key will be visible.'
              : 'Give this key a clear name so you can safely replace or revoke it later.'
          }
          onClose={() => {
            setSecret(undefined);
            setDialogOpen(false);
          }}
          wide
        >
          {secret ? (
            <div>
              <div className="rounded-xl border border-caution/30 bg-caution-soft px-4 py-3">
                <p className="text-[12.5px] font-semibold text-foreground">
                  Copy it before closing
                </p>
                <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
                  Store it in your hosting provider&apos;s secret manager. Voomate stores only a
                  secure hash, so this value cannot be shown again.
                </p>
              </div>
              <div className="mt-3 overflow-hidden rounded-xl bg-[#151513] text-[#f4f1ea]">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-white">{secret.name}</p>
                    <p className="mt-0.5 text-[10.5px] text-white/55">Private key · shown once</p>
                  </div>
                  <CopyButton text={secret.value} label="Copy private key" />
                </div>
                <pre className="overflow-x-auto px-4 py-4 font-mono text-[11.5px] text-[#b8d9a6]">
                  <code>{secret.value}</code>
                </pre>
              </div>
              <DialogActions>
                <Button
                  variant="primary"
                  onClick={() => {
                    setSecret(undefined);
                    setDialogOpen(false);
                  }}
                >
                  Done
                </Button>
              </DialogActions>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (keyName.trim()) void createKey();
              }}
            >
              <Field
                label="Key name"
                htmlFor="identity-key-name"
                hint="Example: Production backend or Staging server"
              >
                <TextInput
                  id="identity-key-name"
                  autoFocus
                  maxLength={80}
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                />
              </Field>
              <div className="mt-4 space-y-1.5">
                <label htmlFor="identity-key-expiry" className="block text-[13px] font-medium">
                  Expires after
                </label>
                <select
                  id="identity-key-expiry"
                  value={expiresInDays}
                  onChange={(event) => setExpiresInDays(Number(event.target.value))}
                  className="h-9.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 text-sm text-foreground focus:border-accent-500"
                >
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                </select>
                <p className="text-[12px] text-muted-foreground">
                  Shorter expiry reduces risk. Create a replacement before this key expires.
                </p>
              </div>
              {error && <p className="mt-3 text-[12px] text-critical">{error}</p>}
              <DialogActions>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSecret(undefined);
                    setDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={busy} disabled={!keyName.trim()}>
                  Create private key
                </Button>
              </DialogActions>
            </form>
          )}
        </Dialog>
      )}

      {error && <p className="text-[12px] text-critical">{error}</p>}
    </div>
  );
}

function CopyButton({
  text,
  label,
  icon = 'clipboard',
  prominent = false,
}: {
  text: string;
  label: string;
  icon?: 'clipboard' | 'sparkles';
  prominent?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const Icon = icon === 'sparkles' ? Sparkles : Clipboard;

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11.5px] font-medium transition-colors',
        prominent
          ? 'h-10 shrink-0 bg-foreground px-4 text-background hover:opacity-90'
          : 'bg-white/10 text-white hover:bg-white/15',
      )}
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
