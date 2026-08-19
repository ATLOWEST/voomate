'use client';

import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  UserCheck,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MerchantRecord {
  id: string;
  name: string;
  domain: string;
  ownerEmail: string;
  plan: 'enterprise' | 'pro' | 'starter' | 'trial';
  activeAgents: number;
  voiceMinutes: number;
  maxMinutes: number;
  platform: 'shopify' | 'woocommerce' | 'custom';
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
}

const MOCK_MERCHANTS: MerchantRecord[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Voomate Dogfood Demo Store',
    domain: 'store.voomate.local',
    ownerEmail: 'admin@voomate.local',
    plan: 'enterprise',
    activeAgents: 2,
    voiceMinutes: 1420,
    maxMinutes: 10000,
    platform: 'shopify',
    status: 'active',
    createdAt: '2026-06-01',
  },
  {
    id: 'org_lumina_apparel',
    name: 'Lumina Luxury Apparel',
    domain: 'lumina-fashion.com',
    ownerEmail: 'sarah@lumina.io',
    plan: 'enterprise',
    activeAgents: 4,
    voiceMinutes: 8450,
    maxMinutes: 20000,
    platform: 'shopify',
    status: 'active',
    createdAt: '2026-06-14',
  },
  {
    id: 'org_apex_gear',
    name: 'Apex Outdoor & Athletic',
    domain: 'apexgear.shop',
    ownerEmail: 'marcus@apexgear.com',
    plan: 'pro',
    activeAgents: 2,
    voiceMinutes: 3280,
    maxMinutes: 5000,
    platform: 'shopify',
    status: 'active',
    createdAt: '2026-07-02',
  },
  {
    id: 'org_zenith_audio',
    name: 'Zenith Studio Sound',
    domain: 'zenithaudio.co',
    ownerEmail: 'support@zenithaudio.co',
    plan: 'pro',
    activeAgents: 1,
    voiceMinutes: 1890,
    maxMinutes: 5000,
    platform: 'custom',
    status: 'active',
    createdAt: '2026-07-19',
  },
  {
    id: 'org_botanica_organics',
    name: 'Botanica Skincare Labs',
    domain: 'botanicaskincare.com',
    ownerEmail: 'elena@botanicaskincare.com',
    plan: 'starter',
    activeAgents: 1,
    voiceMinutes: 640,
    maxMinutes: 1000,
    platform: 'shopify',
    status: 'active',
    createdAt: '2026-08-04',
  },
  {
    id: 'org_nova_gadgets',
    name: 'NovaTech Smart Devices',
    domain: 'novasmart.store',
    ownerEmail: 'david@novasmart.store',
    plan: 'trial',
    activeAgents: 1,
    voiceMinutes: 120,
    maxMinutes: 500,
    platform: 'woocommerce',
    status: 'active',
    createdAt: '2026-08-15',
  },
];

export function MerchantsTab() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<MerchantRecord | null>(null);

  const filteredMerchants = MOCK_MERCHANTS.filter((merchant) => {
    const matchesSearch =
      merchant.name.toLowerCase().includes(search.toLowerCase()) ||
      merchant.domain.toLowerCase().includes(search.toLowerCase()) ||
      merchant.ownerEmail.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === 'all' || merchant.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-6">
      {/* Quick Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Total Merchants</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{MOCK_MERCHANTS.length}</span>
            <Badge tone="positive">
              100% Active
            </Badge>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Multi-tenant PostgreSQL Workspaces</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Enterprise Accounts</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {MOCK_MERCHANTS.filter((m) => m.plan === 'enterprise').length}
            </span>
            <Badge tone="accent">
              High Tier
            </Badge>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Custom Voice Latency SLA</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Total Deployed Agents</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {MOCK_MERCHANTS.reduce((sum, m) => sum + m.activeAgents, 0)}
            </span>
            <span className="text-xs text-muted-foreground">Agents</span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">WebRTC Voice & Chat Widget Bots</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Monthly Voice Consumption</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {MOCK_MERCHANTS.reduce((sum, m) => sum + m.voiceMinutes, 0).toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">/ 41,500 mins</span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Real-time STT & Polly / Nova Output</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant name, domain, or owner email..."
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Plan:</span>
          {['all', 'enterprise', 'pro', 'starter', 'trial'].map((plan) => (
            <button
              key={plan}
              type="button"
              onClick={() => setPlanFilter(plan)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                planFilter === plan
                  ? 'bg-foreground text-background font-semibold shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {plan}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/80 bg-[var(--surface-sunken)]/60 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Merchant Organization</th>
                <th className="px-4 py-3.5">Plan Tier</th>
                <th className="px-4 py-3.5">Agents</th>
                <th className="px-4 py-3.5">Voice Minutes</th>
                <th className="px-4 py-3.5">Integration</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredMerchants.map((merchant) => (
                <tr key={merchant.id} className="transition-colors hover:bg-accent-50/30 dark:hover:bg-accent-950/15">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-100 dark:bg-accent-950/50 font-bold text-accent-800 dark:text-accent-200">
                        {merchant.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{merchant.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{merchant.ownerEmail} · {merchant.domain}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <Badge
                      tone={
                        merchant.plan === 'enterprise'
                          ? 'accent'
                          : merchant.plan === 'pro'
                          ? 'positive'
                          : 'neutral'
                      }
                    >
                      {merchant.plan}
                    </Badge>
                  </td>

                  <td className="px-4 py-4 font-medium text-foreground">
                    {merchant.activeAgents} Active
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{merchant.voiceMinutes.toLocaleString()}</span>
                        <span className="text-muted-foreground">/{merchant.maxMinutes.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                        <div
                          className="h-full rounded-full bg-accent-600 transition-all"
                          style={{ width: `${Math.min(100, (merchant.voiceMinutes / merchant.maxMinutes) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-[var(--surface-sunken)] px-2 py-1 text-xs font-medium text-foreground capitalize">
                      <ShoppingBag className="size-3 text-muted-foreground" />
                      {merchant.platform}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs font-medium"
                        onClick={() => alert(`Inspecting customer workspace: ${merchant.name} (${merchant.id})`)}
                      >
                        Inspect
                      </Button>
                    </div>
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
