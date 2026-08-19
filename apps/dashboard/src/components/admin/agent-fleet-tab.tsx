'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogActions } from '@/components/ui/dialog';

interface AgentRecord {
  id: string;
  name: string;
  orgName: string;
  type: 'voice_webrtc' | 'web_chat' | 'omnichannel';
  model: string;
  modelDisplayName: string;
  tools: string[];
  totalInvocations: number;
  tokensConsumed: string;
  status: 'published' | 'draft' | 'idle';
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
  },
];

export function AgentFleetTab() {
  const [search, setSearch] = useState('');
  const [routingAgent, setRoutingAgent] = useState<AgentRecord | null>(null);

  const filteredAgents = MOCK_AGENTS.filter((agent) =>
    agent.name.toLowerCase().includes(search.toLowerCase()) ||
    agent.orgName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Agent Fleet & Multimodal Models"
          description="Global status of all published customer agents and LLM inference routing."
        />
        <PanelBody className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-background pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-accent-500 focus:outline-none"
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-[var(--border-default)]">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Assigned Model</th>
                  <th className="px-4 py-3">Configured Tools</th>
                  <th className="px-4 py-3">Invocations</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-[var(--surface-sunken)]/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{agent.name}</div>
                      <div className="text-[11.5px] text-muted-foreground">{agent.orgName}</div>
                    </td>
                    <td className="px-4 py-3.5 capitalize text-foreground">
                      {agent.type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {agent.modelDisplayName}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {agent.tools.map((t) => (
                          <span
                            key={t}
                            className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {agent.totalInvocations.toLocaleString()} runs
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        onClick={() => setRoutingAgent(agent)}
                      >
                        Route
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelBody>
      </Panel>

      {/* In-place Model Routing Dialog (Keeps user on /admin) */}
      {routingAgent && (
        <Dialog
          title={`Route LLM Model: ${routingAgent.name}`}
          description={`Assigned to workspace: ${routingAgent.orgName}`}
          onClose={() => setRoutingAgent(null)}
        >
          <div className="space-y-3 py-2 text-[13px]">
            <p className="text-muted-foreground">Select the real-time inference model backend for this agent:</p>
            <div className="space-y-2">
              {[
                { id: 'amazon.nova-sonic-v1:0', name: 'AWS Bedrock Nova 2 (Sonic)', desc: 'Ultra low-latency speech & conversational streaming' },
                { id: 'amazon.nova-pro-v1:0', name: 'AWS Bedrock Nova Pro', desc: 'Complex reasoning and deep tool orchestration' },
                { id: 'anthropic.claude-3-5-sonnet', name: 'Anthropic Claude 3.5 Sonnet', desc: 'High capability multimodal RAG agent' },
              ].map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    routingAgent.model === m.id
                      ? 'border-accent-500 bg-accent-50/50 dark:bg-accent-950/20'
                      : 'border-[var(--border-default)] hover:bg-[var(--surface-sunken)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="modelRoute"
                    checked={routingAgent.model === m.id}
                    onChange={() => {
                      setRoutingAgent({ ...routingAgent, model: m.id, modelDisplayName: m.name });
                    }}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-semibold text-foreground">{m.name}</div>
                    <div className="text-[11.5px] text-muted-foreground">{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <DialogActions>
            <Button variant="secondary" onClick={() => setRoutingAgent(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                alert(`Updated model for ${routingAgent.name} to ${routingAgent.modelDisplayName}`);
                setRoutingAgent(null);
              }}
            >
              Save Route
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
