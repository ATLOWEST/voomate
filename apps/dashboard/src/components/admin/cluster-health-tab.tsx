'use client';

import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';

interface ServiceNode {
  name: string;
  role: string;
  port: number;
  latencyMs: number;
  uptime: string;
}

const SERVICES: ServiceNode[] = [
  {
    name: 'Landing Site',
    role: 'Public Edge Web',
    port: 3000,
    latencyMs: 95,
    uptime: '99.98%',
  },
  {
    name: 'Dashboard & Widget Runtime',
    role: 'Client App & Embed Host',
    port: 3001,
    latencyMs: 18,
    uptime: '99.99%',
  },
  {
    name: 'Connect & Control API Engine',
    role: 'Fastify Backend',
    port: 4000,
    latencyMs: 12,
    uptime: '100.0%',
  },
  {
    name: 'Voice Edge WebRTC Node',
    role: 'Pipecat Python Cluster',
    port: 7860,
    latencyMs: 17,
    uptime: '99.95%',
  },
  {
    name: 'PostgreSQL & pgvector Cluster',
    role: 'Vector Knowledge Index',
    port: 5432,
    latencyMs: 4,
    uptime: '100.0%',
  },
];

const RECENT_AUDIT_LOGS = [
  { time: '11:38:14', service: 'Voice Edge', message: 'WebRTC RTVI session connected: room_webrtc_829471' },
  { time: '11:37:48', service: 'Bedrock Nova', message: 'ConverseStream normalized 4 conversation turns' },
  { time: '11:36:02', service: 'Connect API', message: 'Shopify order verification tool executed: DEMO-1001' },
  { time: '11:35:30', service: 'pgvector RAG', message: 'Retrieved 3 similarity chunks for query: "return policy"' },
  { time: '11:34:19', service: 'Dashboard', message: 'Widget embed v2 bundle served to client runtime' },
  { time: '11:32:05', service: 'Auth RLS', message: 'Tenant boundary verified for current workspace' },
];

export function ClusterHealthTab() {
  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Cluster Nodes & Microservices"
          description="Operational status and response latency of all backend and edge services."
        />
        <PanelBody className="p-0">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Port</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3 text-right">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {SERVICES.map((node) => (
                <tr key={node.name} className="hover:bg-[var(--surface-sunken)]/50 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-foreground">
                    {node.name}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {node.role}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-foreground">
                    :{node.port}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-foreground">
                    {node.latencyMs}ms
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-foreground">
                    {node.uptime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Recent Cluster Events"
          description="Real-time communication and tool execution trace across microservices."
        />
        <PanelBody className="p-0">
          <div className="divide-y divide-[var(--border-default)] font-mono text-xs">
            {RECENT_AUDIT_LOGS.map((log, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--surface-sunken)]/40 transition-colors">
                <span className="text-muted-foreground shrink-0">{log.time}</span>
                <span className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[11px] font-semibold text-foreground shrink-0">
                  {log.service}
                </span>
                <span className="text-foreground truncate">{log.message}</span>
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
