'use client';

import { useState } from 'react';
import { Plus, Search, Check, Copy, ExternalLink, Settings2, Trash2 } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogActions } from '@/components/ui/dialog';
import { Field, TextInput } from '@/components/ui/field';

export interface MerchantRecord {
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

const INITIAL_MERCHANTS: MerchantRecord[] = [
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
  const [merchants, setMerchants] = useState<MerchantRecord[]>(INITIAL_MERCHANTS);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [inspectingMerchant, setInspectingMerchant] = useState<MerchantRecord | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Merchant Form State
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPlan, setNewPlan] = useState<'enterprise' | 'pro' | 'starter' | 'trial'>('pro');
  const [newPlatform, setNewPlatform] = useState<'shopify' | 'woocommerce' | 'custom'>('shopify');
  const [newMaxMinutes, setNewMaxMinutes] = useState(5000);

  const filteredMerchants = merchants.filter((merchant) => {
    const matchesSearch =
      merchant.name.toLowerCase().includes(search.toLowerCase()) ||
      merchant.domain.toLowerCase().includes(search.toLowerCase()) ||
      merchant.ownerEmail.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === 'all' || merchant.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const handleCreateMerchant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDomain.trim() || !newEmail.trim()) {
      return;
    }

    const created: MerchantRecord = {
      id: `org_${Date.now().toString(36)}`,
      name: newName.trim(),
      domain: newDomain.trim().replace(/^https?:\/\//, ''),
      ownerEmail: newEmail.trim(),
      plan: newPlan,
      activeAgents: 1,
      voiceMinutes: 0,
      maxMinutes: Number(newMaxMinutes) || 5000,
      platform: newPlatform,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0] || new Date().toISOString(),
    };

    setMerchants([created, ...merchants]);
    setCreateModalOpen(false);

    // Reset Form
    setNewName('');
    setNewDomain('');
    setNewEmail('');
    setNewPlan('pro');
    setNewPlatform('shopify');
    setNewMaxMinutes(5000);
  };

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Merchants & Customer Workspaces"
          description="Provision new customer organizations, allocate voice quotas, and manage client storefronts."
          action={
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
                <Plus className="size-3.5 mr-1.5" />
                Create Merchant
              </Button>
            </div>
          }
        />
        <PanelBody className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search merchant name, domain, or email..."
                className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-background pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-accent-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {['all', 'enterprise', 'pro', 'starter', 'trial'].map((plan) => (
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
          </div>

          <div className="overflow-hidden rounded-lg border border-[var(--border-default)]">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Merchant Workspace</th>
                  <th className="px-4 py-3">Plan Tier</th>
                  <th className="px-4 py-3">Active Agents</th>
                  <th className="px-4 py-3">Voice Minutes Quota</th>
                  <th className="px-4 py-3">Platform</th>
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
                      <span className="text-muted-foreground"> / {merchant.maxMinutes.toLocaleString()} mins</span>
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

      {/* Create New Merchant Modal */}
      {createModalOpen && (
        <Dialog
          title="Create Merchant Workspace"
          description="Onboard a new merchant organization to the Voomate platform."
          onClose={() => setCreateModalOpen(false)}
          wide
        >
          <form onSubmit={handleCreateMerchant} className="space-y-4 py-2">
            <Field label="Merchant / Store Name" htmlFor="merchant-name">
              <TextInput
                id="merchant-name"
                required
                placeholder="e.g. Acme Fashion Co."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Store Domain" htmlFor="merchant-domain" hint="e.g. acme.com or store.myshopify.com">
                <TextInput
                  id="merchant-domain"
                  required
                  placeholder="acmefashion.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
              </Field>

              <Field label="Owner Email" htmlFor="merchant-email">
                <TextInput
                  id="merchant-email"
                  type="email"
                  required
                  placeholder="admin@acmefashion.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Plan Tier" htmlFor="merchant-plan">
                <select
                  id="merchant-plan"
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as any)}
                  className="h-9.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 text-sm text-[var(--text-primary)] focus:border-accent-500 focus:outline-none"
                >
                  <option value="trial">Trial (500 mins)</option>
                  <option value="starter">Starter (1,000 mins)</option>
                  <option value="pro">Pro (5,000 mins)</option>
                  <option value="enterprise">Enterprise (20,000+ mins)</option>
                </select>
              </Field>

              <Field label="Store Platform" htmlFor="merchant-platform">
                <select
                  id="merchant-platform"
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value as any)}
                  className="h-9.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 text-sm text-[var(--text-primary)] focus:border-accent-500 focus:outline-none"
                >
                  <option value="shopify">Shopify</option>
                  <option value="woocommerce">WooCommerce</option>
                  <option value="custom">Custom Headless</option>
                </select>
              </Field>

              <Field label="Voice Minutes Quota" htmlFor="merchant-quota">
                <TextInput
                  id="merchant-quota"
                  type="number"
                  min={100}
                  step={500}
                  value={newMaxMinutes}
                  onChange={(e) => setNewMaxMinutes(Number(e.target.value))}
                />
              </Field>
            </div>

            <DialogActions>
              <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Provision Merchant
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {/* Inspect & Manage Workspace Modal */}
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
                <span className="text-[11px] font-medium uppercase text-muted-foreground">Store Domain</span>
                <p className="font-medium text-foreground">{inspectingMerchant.domain}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium uppercase text-muted-foreground">Owner Account</span>
                <p className="font-medium text-foreground">{inspectingMerchant.ownerEmail}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium uppercase text-muted-foreground">Plan Subscription</span>
                <p className="capitalize font-medium text-foreground">{inspectingMerchant.plan}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium uppercase text-muted-foreground">E-Commerce Platform</span>
                <p className="capitalize font-medium text-foreground">{inspectingMerchant.platform}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">Voice Minutes Quota Allocation</span>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{inspectingMerchant.voiceMinutes.toLocaleString()} minutes consumed</span>
                <span className="text-muted-foreground">{inspectingMerchant.maxMinutes.toLocaleString()} minutes monthly limit</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                <div
                  className="h-full bg-accent-600 rounded-full"
                  style={{ width: `${Math.min(100, (inspectingMerchant.voiceMinutes / inspectingMerchant.maxMinutes) * 100)}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-default)] p-3 bg-background">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">Client Embed Snippet</span>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground bg-[var(--surface-sunken)] p-2 rounded truncate select-all">
                {`<script src="http://127.0.0.1:3001/embed.js" data-agent-id="${inspectingMerchant.id}" async></script>`}
              </p>
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
