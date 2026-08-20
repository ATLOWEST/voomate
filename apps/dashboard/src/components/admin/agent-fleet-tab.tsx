'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/lib/session';
import { api } from '@/lib/api';
import { messageFor } from '@/lib/hooks';

interface AgentRecord {
  id: string;
  name: string;
  catalogType: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  websiteUrl: string;
  organizationName: string;
  organizationSlug: string;
  updatedAt: string;
}

const toneFor = (status: AgentRecord['status']) =>
  status === 'active' ? 'positive' : status === 'paused' ? 'accent' : 'neutral';

export function AgentFleetTab() {
  const { getToken } = useSession();
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.get<{ agents: AgentRecord[] }>('/v1/platform/agents', {
        accessToken: await getToken(),
      });
      setAgents(result.agents);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return agents.filter(
      (agent) =>
        term === '' ||
        agent.name.toLowerCase().includes(term) ||
        agent.organizationName.toLowerCase().includes(term) ||
        agent.catalogType.toLowerCase().includes(term),
    );
  }, [agents, search]);

  return (
    <Panel>
      <PanelHeader
        title="Agent fleet"
        description="Real agent records across workspaces. Model routing remains tenant-controlled and is never changed from this global page."
        action={
          <Button size="sm" onClick={() => void loadAgents()} loading={loading}>
            <RefreshCw className="mr-1.5 size-3.5" />
            Refresh
          </Button>
        }
      />
      <PanelBody className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search agents or workspaces..."
            className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-background pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-accent-500 focus:outline-none"
          />
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-800"
          >
            {error}
          </p>
        )}
        <div className="overflow-hidden rounded-lg border border-[var(--border-default)]">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Website</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading live agents…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No agents found.
                  </td>
                </tr>
              ) : (
                filtered.map((agent) => (
                  <tr
                    key={agent.id}
                    className="transition-colors hover:bg-[var(--surface-sunken)]/50"
                  >
                    <td className="px-4 py-3.5 font-semibold text-foreground">{agent.name}</td>
                    <td className="px-4 py-3.5">
                      <div className="text-foreground">{agent.organizationName}</div>
                      <div className="text-[11.5px] text-muted-foreground">
                        {agent.organizationSlug}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 capitalize text-foreground">{agent.catalogType}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={toneFor(agent.status)}>{agent.status}</Badge>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3.5 text-muted-foreground">
                      {agent.websiteUrl}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PanelBody>
    </Panel>
  );
}
