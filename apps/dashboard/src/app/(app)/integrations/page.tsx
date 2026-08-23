'use client';

import type { Agent } from '@voomate/core';
import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Database,
  KeyRound,
  Plus,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Dialog, DialogActions } from '@/components/ui/dialog';
import { Field, TextInput } from '@/components/ui/field';
import { api } from '@/lib/api';
import { useApiAction, useApiQuery } from '@/lib/hooks';
import { useSession } from '@/lib/session';

type Capability = { name?: string; description?: string };

type ReadConnection = {
  id: string;
  agentId: string;
  name: string;
  endpointUrl: string;
  status: 'pending' | 'active' | 'error' | 'revoked';
  capabilities: Capability[] | null;
  lastVerifiedAt: string | null;
  lastUsedAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
};

export default function IntegrationsPage() {
  const { organization } = useSession();
  const agents = useApiQuery<{ agents: Agent[] }>(organization === undefined ? null : '/v1/agents');
  const connections = useApiQuery<{ connections: ReadConnection[] }>(
    organization === undefined ? null : '/v1/connect/read-connections',
  );
  const [connectOpen, setConnectOpen] = useState(false);
  const activeConnections = (connections.data?.connections ?? []).filter(
    (connection) => connection.status === 'active',
  );
  const visibleConnections = (connections.data?.connections ?? []).filter(
    (connection) => connection.status !== 'revoked',
  );
  const capabilityCount = activeConnections.reduce(
    (total, connection) => total + (connection.capabilities?.length ?? 0),
    0,
  );

  return (
    <main className="agent-operations-enter mx-auto w-full max-w-[1280px] px-5 pb-14 pt-5 sm:px-8 sm:pt-8 lg:px-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold leading-tight text-foreground">Connections</h1>
          <p className="mt-2 max-w-xl text-[13.5px] leading-6 text-muted-foreground">
            Give agents approved access to current business information. Your credentials stay in
            your own system.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="size-4" />}
          disabled={(agents.data?.agents.length ?? 0) === 0}
          onClick={() => setConnectOpen(true)}
        >
          Connect data source
        </Button>
      </header>

      {(agents.error ?? connections.error) !== undefined && (
        <div className="mt-6">
          <Callout tone="critical" title="Connections could not be loaded">
            {agents.error ?? connections.error}
          </Callout>
        </div>
      )}

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <ConnectionMetric
          label="Active connections"
          value={activeConnections.length}
          icon={ServerCog}
        />
        <ConnectionMetric label="Available live reads" value={capabilityCount} icon={Database} />
        <ConnectionMetric label="Write access" value="Separate" icon={ShieldCheck} />
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-foreground">Client data connections</h2>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
              Live reads are scoped to one agent and verified before use.
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw className={`size-4 ${connections.loading ? 'animate-spin' : ''}`} />}
            onClick={connections.refetch}
          >
            Refresh
          </Button>
        </div>

        <div className="mt-4">
          {connections.loading ? (
            <ConnectionSkeleton />
          ) : visibleConnections.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-lg bg-[var(--surface-sunken)] px-6 py-10 text-center">
              <span className="grid size-11 place-items-center rounded-lg bg-[var(--surface-sunken)] text-muted-foreground">
                <Database className="size-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-foreground">
                No live data connected
              </h3>
              <p className="mt-2 max-w-md text-[13px] leading-5 text-muted-foreground">
                Add a Voomate Connect endpoint when your agent needs current business information.
              </p>
              {(agents.data?.agents.length ?? 0) > 0 && (
                <Button className="mt-5" onClick={() => setConnectOpen(true)}>
                  Connect first source
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {visibleConnections.map((connection) => (
                <ConnectionRow
                  key={connection.id}
                  connection={connection}
                  agent={agents.data?.agents.find((agent) => agent.id === connection.agentId)}
                  onChanged={connections.refetch}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-7 grid gap-3 lg:grid-cols-3">
        <Boundary
          icon={Database}
          title="Named reads only"
          detail="The agent cannot send arbitrary SQL or choose an undeclared endpoint."
        />
        <Boundary
          icon={ShieldCheck}
          title="Public fields only"
          detail="Your SDK projects allowlisted fields before returning any result."
        />
        <Boundary
          icon={KeyRound}
          title="Writes stay separate"
          detail="Actions use independent scopes, policy checks and confirmations."
        />
      </section>

      {connectOpen && agents.data !== undefined && (
        <ConnectDialog
          agents={agents.data.agents}
          onClose={() => setConnectOpen(false)}
          onCreated={connections.refetch}
        />
      )}
    </main>
  );
}

function ConnectionRow({
  connection,
  agent,
  onChanged,
}: {
  connection: ReadConnection;
  agent: Agent | undefined;
  onChanged: () => void;
}) {
  const verify = useApiAction(async (auth) => {
    await api.post(`/v1/connect/read-connections/${connection.id}/verify`, undefined, auth);
    onChanged();
  });
  const revoke = useApiAction(async (auth) => {
    await api.delete(`/v1/connect/read-connections/${connection.id}`, auth);
    onChanged();
  });
  const capabilities = connection.capabilities ?? [];

  return (
    <li className="rounded-lg bg-[var(--surface-soft)] px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--surface-sunken)] text-foreground">
          <ServerCog className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-semibold text-foreground">{connection.name}</h3>
            <ConnectionStatus status={connection.status} />
          </div>
          <p className="mt-1 truncate font-mono text-[11.5px] text-muted-foreground">
            {connection.endpointUrl}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
            <span>{agent?.name ?? 'Unknown agent'}</span>
            <span>{capabilities.length} named reads</span>
            <span>
              {connection.lastVerifiedAt
                ? `Verified ${new Date(connection.lastVerifiedAt).toLocaleDateString()}`
                : 'Not verified'}
            </span>
          </div>
          {capabilities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {capabilities.slice(0, 4).map((capability, index) => (
                <span
                  key={`${capability.name ?? 'read'}-${index}`}
                  className="rounded-md bg-[var(--surface-sunken)] px-2 py-1 font-mono text-[10.5px] text-muted-foreground"
                >
                  {capability.name ?? 'named_read'}
                </span>
              ))}
              {capabilities.length > 4 && (
                <span className="px-1 py-1 text-[10.5px] text-muted-foreground">
                  +{capabilities.length - 4} more
                </span>
              )}
            </div>
          )}
          {(verify.error ?? revoke.error) !== undefined && (
            <p className="mt-3 text-[12px] text-critical">{verify.error ?? revoke.error}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start lg:self-center">
          <Button
            size="sm"
            loading={verify.busy}
            icon={<RefreshCw className="size-3.5" />}
            onClick={() => void verify.run()}
          >
            {connection.status === 'active' ? 'Verify again' : 'Verify'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={revoke.busy}
            icon={<Trash2 className="size-3.5" />}
            onClick={() => void revoke.run()}
          >
            Revoke
          </Button>
        </div>
      </div>
    </li>
  );
}

function ConnectDialog({
  agents,
  onClose,
  onCreated,
}: {
  agents: Agent[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [agentId, setAgentId] = useState<string>(agents[0]?.id ?? '');
  const [name, setName] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [secret, setSecret] = useState<string>();
  const [copied, setCopied] = useState(false);
  const endpointValid = useMemo(() => safeUrl(endpointUrl), [endpointUrl]);

  useEffect(() => {
    if (!agentId && agents[0]) setAgentId(agents[0].id);
  }, [agentId, agents]);

  const create = useApiAction(async (auth) => {
    const result = await api.post<{ secret: string }>(
      '/v1/connect/read-connections',
      { agentId, name: name.trim(), endpointUrl: endpointUrl.trim() },
      auth,
    );
    setSecret(result.secret);
    onCreated();
  });

  if (secret !== undefined) {
    return (
      <Dialog
        title="Connection created"
        description="Store this secret in the client server now. Voomate will not show it again."
        onClose={onClose}
      >
        <Callout tone="positive" title="Read-only credential ready">
          The connection remains pending until its endpoint is verified.
        </Callout>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--surface-sunken)] p-3">
          <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[12px]">
            {secret}
          </code>
          <Button
            size="sm"
            icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            onClick={() => {
              void navigator.clipboard.writeText(secret).then(() => setCopied(true));
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <DialogActions>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      title="Connect live business data"
      description="Register the read-only Voomate Connect endpoint running in your client server."
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field label="Agent" htmlFor="connection-agent">
          <select
            id="connection-agent"
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
            className="min-h-10 w-full rounded-lg border border-border bg-card px-3 text-[13px] text-foreground"
          >
            {agents.map((agent) => (
              <option value={agent.id} key={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Connection name"
          htmlFor="connection-name"
          hint="A clear internal label, such as Store API or Scheduling."
        >
          <TextInput
            id="connection-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Store API"
          />
        </Field>
        <Field
          label="Endpoint URL"
          htmlFor="connection-url"
          hint="HTTPS is required outside local development."
          error={create.error}
        >
          <TextInput
            id="connection-url"
            value={endpointUrl}
            onChange={(event) => setEndpointUrl(event.target.value)}
            placeholder="https://api.example.com/voomate/read"
          />
        </Field>
      </div>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          loading={create.busy}
          disabled={!agentId || !name.trim() || !endpointValid}
          onClick={() => void create.run()}
        >
          Create connection
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ConnectionMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Database;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-[var(--surface-soft)] px-5 py-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-sunken)] text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function Boundary({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Database;
  title: string;
  detail: string;
}) {
  return (
    <article className="rounded-lg bg-[var(--surface-soft)] p-5 sm:p-6">
      <Icon className="size-4.5 text-accent-700 dark:text-accent-300" />
      <h3 className="mt-4 text-[13.5px] font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-[12.5px] leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

function ConnectionStatus({ status }: { status: ReadConnection['status'] }) {
  const tone = status === 'active' ? 'positive' : status === 'error' ? 'critical' : 'caution';
  return <Badge tone={tone}>{status}</Badge>;
}

function ConnectionSkeleton() {
  return (
    <div className="space-y-4 p-6" aria-label="Loading connections">
      {[0, 1].map((item) => (
        <div key={item} className="h-20 animate-pulse rounded-md bg-[var(--surface-sunken)]" />
      ))}
    </div>
  );
}

function safeUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
    );
  } catch {
    return false;
  }
}
