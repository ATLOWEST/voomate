'use client';

import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Globe,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ServiceNode {
  name: string;
  role: string;
  port: number;
  url: string;
  latencyMs: number;
  status: 'healthy' | 'degraded' | 'down';
  uptime: string;
}

const SERVICES: ServiceNode[] = [
  {
    name: 'Landing & Marketing Site',
    role: 'Public Edge Web',
    port: 3000,
    url: 'http://127.0.0.1:3000',
    latencyMs: 95,
    status: 'healthy',
    uptime: '99.98%',
  },
  {
    name: 'Merchant Dashboard & Widget Runtime',
    role: 'Client App & Embed Host',
    port: 3001,
    url: 'http://127.0.0.1:3001/embed.js',
    latencyMs: 18,
    status: 'healthy',
    uptime: '99.99%',
  },
  {
    name: 'Connect & Control API Engine',
    role: 'Multi-Tenant Fastify Backend',
    port: 4000,
    url: 'http://127.0.0.1:4000/health',
    latencyMs: 12,
    status: 'healthy',
    uptime: '100.0%',
  },
  {
    name: 'Voice Edge WebRTC Node',
    role: 'Pipecat RTVI Python Cluster',
    port: 7860,
    url: 'http://127.0.0.1:7860',
    latencyMs: 17,
    status: 'healthy',
    uptime: '99.95%',
  },
  {
    name: 'PostgreSQL & pgvector Cluster',
    role: 'Multi-Tenant Knowledge Vector Index',
    port: 5432,
    url: 'localhost:5432/voomate',
    latencyMs: 4,
    status: 'healthy',
    uptime: '100.0%',
  },
];

const RECENT_AUDIT_LOGS = [
  { time: '11:30:14', level: 'info', service: 'Voice Edge', message: 'WebRTC RTVI session initialized: room_webrtc_829471' },
  { time: '11:29:48', level: 'info', service: 'Bedrock Nova', message: 'ConverseStream normalized 4 conversation turns (role alternation ok)' },
  { time: '11:28:02', level: 'info', service: 'Connect API', message: 'Shopify order verification tool executed: orderId DEMO-1001' },
  { time: '11:26:30', level: 'info', service: 'pgvector RAG', message: 'Retrieved 3 similarity chunks for query: "30-day return policy"' },
  { time: '11:24:19', level: 'info', service: 'Dashboard', message: 'Widget embed v2 bundle served to client runtime (398px x 639px)' },
  { time: '11:21:05', level: 'info', service: 'Auth RLS', message: 'Tenant boundary verified for organization: Voomate Dogfood Demo Store' },
];

export function ClusterHealthTab() {
  const [logs, setLogs] = useState(RECENT_AUDIT_LOGS);

  return (
    <div className="space-y-6">
      {/* Cluster Node Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((node) => (
          <div
            key={node.name}
            className="rounded-2xl border border-border/80 bg-card/85 p-5 shadow-sm backdrop-blur-md transition-all hover:border-border"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11.5px] font-medium text-muted-foreground">{node.role}</span>
                <h4 className="text-sm font-semibold text-foreground mt-0.5">{node.name}</h4>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Healthy
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-border/60 pt-3 text-xs">
              <div>
                <span className="text-muted-foreground">Port / Target:</span>{' '}
                <span className="font-mono font-medium text-foreground">:{node.port}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Latency:</span>{' '}
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{node.latencyMs}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">Uptime:</span>{' '}
                <span className="font-medium text-foreground">{node.uptime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Cluster Event Log Stream */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/80 bg-[var(--surface-sunken)]/60 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Terminal className="size-4 text-accent-600" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Live Cluster Event Stream & Audit Log</h3>
              <p className="text-[11.5px] text-muted-foreground">Real-time microservices communication and tool execution trace.</p>
            </div>
          </div>

          <Badge tone="neutral">
            P50 Cluster Latency: 18ms
          </Badge>
        </div>

        <div className="divide-y divide-border/60 bg-background/50 font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-accent-50/20 dark:hover:bg-accent-950/10">
              <span className="text-muted-foreground shrink-0">{log.time}</span>
              <span className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[10.5px] font-semibold text-accent-700 dark:text-accent-300 shrink-0">
                {log.service}
              </span>
              <span className="text-foreground truncate">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
