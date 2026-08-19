'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogActions } from '@/components/ui/dialog';

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
  const [inspectingMerchant, setInspectingMerchant] = useState<MerchantRecord | null>(null);

  const filteredMerchants = MOCK_MERCHANTS.filter((merchant) => {
    const matchesSearch =
      merchant.name.toLowerCase().includes(search.toLowerCase()) ||
      merchant.domain.toLowerCase().includes(search.toLowerCase()) ||
      merchant.ownerEmail.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === 'all' || merchant.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Customer Workspaces"
          description="Directory of all merchant accounts, subscribed plan tiers, and usage quotas."
          action={
            <div className="flex items-center gap-2">
              {['all', 'enterprise', 'pro', 'starter'].map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setPlanFilter(plan)}
                  className={`rounded-lg px-2.5 py-1 text-[12.5px] font-medium capitalize transition-colors ${
                    planFilter === plan
                      ? 'bg-foreground text-background font-semibold'
                      : 'text-muted-foreground hover:bg-[var(--surface-sunken)] hover:text-foreground'
                  }`}
                >
                  {plan}
                </button>
              ))}
            </div>
          }
        />
        <PanelBody className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workspaces..."
              className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-background pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-accent-500 focus:outline-none"
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-[var(--border-default)]">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Agents</th>
                  <th className="px-4 py-3">Voice Minutes</th>
                  <th className="px-4 py-3">Integration</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {filteredMerchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-[var(--surface-sunken)]/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{merchant.name}</div>
                      <div className="text-[11.5px] text-muted-foreground">{merchant.ownerEmail} · {merchant.domain}</div>
                    </td>
                    <td className="px-4 py-3.5">
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
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {merchant.activeAgents} Active
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-foreground">{merchant.voiceMinutes.toLocaleString()}</span>
                      <span className="text-muted-foreground"> / {merchant.maxMinutes.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3.5 capitalize text-foreground">
                      {merchant.platform}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        onClick={() => setInspectingMerchant(merchant)}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelBody>
      </Panel>

      {/* In-place Inspector Dialog (Keeps user on /admin) */}
      {inspectingMerchant && (
        <Dialog
          title={inspectingMerchant.name}
          description={`Workspace ID: ${inspectingMerchant.id}`}
          onClose={() => setInspectingMerchant(null)}
          wide
        >
          <div className="space-y-4 py-2 text-[13px]">
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-[var(--surface-sunken)] p-3.5">
              <div>
                <span className="text-[11px] font-medium uppercase text-muted-foreground">Domain</span>
                <p className="font-medium text-foreground">{inspectingMerchant.domain}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium uppercase text-muted-foreground">Owner</span>
                <p className="font-medium text-foreground">{inspectingMerchant.ownerEmail}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium uppercase text-muted-foreground">Plan Tier</span>
                <p className="capitalize font-medium text-foreground">{inspectingMerchant.plan}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium uppercase text-muted-foreground">Platform</span>
                <p className="capitalize font-medium text-foreground">{inspectingMerchant.platform}</p>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium uppercase text-muted-foreground">Monthly Voice Quota</span>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{inspectingMerchant.voiceMinutes.toLocaleString()} minutes used</span>
                <span className="text-muted-foreground">{inspectingMerchant.maxMinutes.toLocaleString()} total quota</span>
              </div>
            </div>
          </div>

          <DialogActions>
            <Button variant="secondary" onClick={() => setInspectingMerchant(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
