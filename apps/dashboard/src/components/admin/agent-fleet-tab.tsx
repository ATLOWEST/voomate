'use client';

import { useState } from 'react';
import {
  Bot,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Mic,
  Play,
  RotateCw,
  Search,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AgentRecord {
  id: string;
  name: string;
  orgName: string;
  type: 'voice_webrtc' | 'web_chat' | 'omnichannel';
  model: 'amazon.nova-sonic-v1:0' | 'amazon.nova-pro-v1:0' | 'anthropic.claude-3-5-sonnet';
  modelDisplayName: string;
  tools: string[];
  totalInvocations: number;
  tokensConsumed: string;
  status: 'published' | 'draft' | 'idle';
  avgLatency: string;
}

const MOCK_AGENTS: AgentRecord[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Voomate Dogfood Assistant',
    orgName: 'Voomate Dogfood Demo Store',
    type: 'omnichannel',
    model: 'amazon.nova-sonic-v1:0',
    modelDisplayName: 'AWS Bedrock Nova 2 (Sonic)',
    tools: ['check_order_status', 'search_catalog', 'return_policy_faq'],
    totalInvocations: 12480,
    tokensConsumed: '4.2M tokens',
    status: 'published',
    avgLatency: '240ms',
  },
  {
    id: 'agent_lumina_stylist',
    name: 'Lumina VIP Personal Stylist',
    orgName: 'Lumina Luxury Apparel',
    type: 'voice_webrtc',
    model: 'amazon.nova-sonic-v1:0',
    modelDisplayName: 'AWS Bedrock Nova 2 (Sonic)',
    tools: ['fit_guide_advisor', 'vip_stock_lookup', 'size_exchange_tool'],
    totalInvocations: 48920,
    tokensConsumed: '18.6M tokens',
    status: 'published',
    avgLatency: '220ms',
  },
  {
    id: 'agent_apex_support',
    name: 'Apex Gear Support Bot',
    orgName: 'Apex Outdoor & Athletic',
    type: 'web_chat',
    model: 'amazon.nova-pro-v1:0',
    modelDisplayName: 'AWS Bedrock Nova Pro',
    tools: ['warranty_checker', 'order_tracking', 'technical_specs_rag'],
    totalInvocations: 19400,
    tokensConsumed: '7.1M tokens',
    status: 'published',
    avgLatency: '380ms',
  },
  {
    id: 'agent_zenith_concierge',
    name: 'Zenith Studio Sound Concierge',
    orgName: 'Zenith Studio Sound',
    type: 'voice_webrtc',
    model: 'amazon.nova-sonic-v1:0',
    modelDisplayName: 'AWS Bedrock Nova 2 (Sonic)',
    tools: ['dac_compatibility_check', 'cable_customizer', 'shipping_rates'],
    totalInvocations: 8200,
    tokensConsumed: '3.4M tokens',
    status: 'published',
    avgLatency: '235ms',
  },
];

export function AgentFleetTab() {
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState<string>('all');

  const filteredAgents = MOCK_AGENTS.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.orgName.toLowerCase().includes(search.toLowerCase()) ||
      agent.tools.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesModel = modelFilter === 'all' || agent.model === modelFilter;
    return matchesSearch && matchesModel;
  });

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Total Active Agents</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{MOCK_AGENTS.length}</span>
            <Badge tone="positive">
              100% Published
            </Badge>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Multi-modal WebRTC & Chat bots</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Primary LLM Backbone</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">AWS Bedrock Nova</span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">us-east-1 Converse API Stream</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Total Invocations (MTD)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {MOCK_AGENTS.reduce((acc, a) => acc + a.totalInvocations, 0).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Across customer storefronts</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Average Fleet Latency</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">244 ms</span>
            <Badge tone="positive">
              Sub-second
            </Badge>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">End-to-end voice turnaround</p>
        </div>
      </div>

      {/* Search & Model Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents, merchants, or tool names..."
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Model:</span>
          {[
            { id: 'all', label: 'All Models' },
            { id: 'amazon.nova-sonic-v1:0', label: 'Nova Sonic' },
            { id: 'amazon.nova-pro-v1:0', label: 'Nova Pro' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setModelFilter(item.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                modelFilter === item.id
                  ? 'bg-foreground text-background font-semibold shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agents Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/80 bg-[var(--surface-sunken)]/60 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Agent & Customer</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Assigned LLM Model</th>
                <th className="px-4 py-3.5">Configured Tools</th>
                <th className="px-4 py-3.5">Volume & Tokens</th>
                <th className="px-4 py-3.5">P50 Latency</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="transition-colors hover:bg-accent-50/30 dark:hover:bg-accent-950/15">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-100 dark:bg-accent-950/50 text-accent-700 dark:text-accent-300">
                        <Bot className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{agent.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{agent.orgName}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                      {agent.type === 'voice_webrtc' ? (
                        <>
                          <Mic className="size-3.5 text-accent-600" />
                          Voice WebRTC
                        </>
                      ) : agent.type === 'web_chat' ? (
                        <>
                          <Layers className="size-3.5 text-blue-500" />
                          Web Chat
                        </>
                      ) : (
                        <>
                          <Zap className="size-3.5 text-emerald-500" />
                          Omnichannel
                        </>
                      )}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-medium text-xs text-foreground">{agent.modelDisplayName}</div>
                    <div className="text-[11px] font-mono text-muted-foreground truncate max-w-[180px]">
                      {agent.model}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {agent.tools.map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-semibold text-foreground">{agent.totalInvocations.toLocaleString()} runs</div>
                    <div className="text-xs text-muted-foreground">{agent.tokensConsumed}</div>
                  </td>

                  <td className="px-4 py-4 font-mono font-medium text-xs text-emerald-600 dark:text-emerald-400">
                    {agent.avgLatency}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs font-medium"
                      onClick={() => alert(`Configuring LLM model route for: ${agent.name}`)}
                    >
                      Route Model
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
