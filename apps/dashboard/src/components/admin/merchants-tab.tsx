'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogActions } from '@/components/ui/dialog';
import { useSession } from '@/lib/session';
import { api } from '@/lib/api';
import { messageFor } from '@/lib/hooks';

export interface MerchantRecord {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'growth' | 'enterprise';
  ownerEmail: string | null;
  activeAgentCount: number;
  createdAt: string;
}

const planTone = (plan: MerchantRecord['plan']) =>
  plan === 'enterprise' ? 'accent' : plan === 'growth' ? 'positive' : 'neutral';

export function MerchantsTab() {
  const { getToken } = useSession();
  const [merchants, setMerchants] = useState<MerchantRecord[]>([]);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | MerchantRecord['plan']>('all');
  const [inspectingMerchant, setInspectingMerchant] = useState<MerchantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadMerchants = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.get<{ merchants: MerchantRecord[] }>('/v1/platform/merchants', {
        accessToken: await getToken(),
      });
      setMerchants(result.merchants);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadMerchants();
  }, [loadMerchants]);

  const filteredMerchants = useMemo(() => {
    const term = search.trim().toLowerCase();
    return merchants.filter((merchant) => {
      const matchesSearch =
        term === '' ||
        merchant.name.toLowerCase().includes(term) ||
        merchant.slug.toLowerCase().includes(term) ||
        merchant.ownerEmail?.toLowerCase().includes(term) === true;
      return matchesSearch && (planFilter === 'all' || merchant.plan === planFilter);
    });
  }, [merchants, planFilter, search]);

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Merchants & Customer Workspaces"
          description="Live workspace records only. Plans and active-agent totals come from the production database."
          action={
            <Button size="sm" onClick={() => void loadMerchants()} loading={loading}>
              <RefreshCw className="mr-1.5 size-3.5" />
              Refresh
            </Button>
          }
        />
        <PanelBody className="space-y-4">
          <p className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-[12px] leading-5 text-muted-foreground">
            New merchant accounts start through the normal sign-up flow. After sign-in, the user
            creates their own workspace; this keeps ownership and billing evidence tied to the real
            account.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search workspace, slug, or owner email..."
                className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-background pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(['all', 'free', 'starter', 'growth', 'enterprise'] as const).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setPlanFilter(plan)}
                  className={`rounded-lg px-2.5 py-1 text-[12.5px] font-medium capitalize transition-colors ${
                    planFilter === plan
                      ? 'bg-foreground font-semibold text-background'
                      : 'text-muted-foreground hover:bg-[var(--surface-sunken)] hover:text-foreground'
                  }`}
                >
                  {plan}
                </button>
              ))}
            </div>
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
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Active agents</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Loading live workspaces…
                    </td>
                  </tr>
                ) : filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No workspaces match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map((merchant) => (
                    <tr
                      key={merchant.id}
                      className="transition-colors hover:bg-[var(--surface-sunken)]/50"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground">{merchant.name}</div>
                        <div className="text-[11.5px] text-muted-foreground">{merchant.slug}</div>
                      </td>
                      <td className="px-4 py-3.5 text-foreground">
                        {merchant.ownerEmail ?? 'Owner record unavailable'}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={planTone(merchant.plan)}>{merchant.plan}</Badge>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        {merchant.activeAgentCount}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button size="sm" onClick={() => setInspectingMerchant(merchant)}>
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PanelBody>
      </Panel>

      {inspectingMerchant && (
        <Dialog
          title={inspectingMerchant.name}
          description={`Workspace ID: ${inspectingMerchant.id}`}
          onClose={() => setInspectingMerchant(null)}
        >
          <dl className="grid grid-cols-1 gap-3 py-2 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-medium uppercase text-muted-foreground">
                Owner account
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {inspectingMerchant.ownerEmail ?? 'Unavailable'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase text-muted-foreground">Plan</dt>
              <dd className="mt-1 capitalize font-medium text-foreground">
                {inspectingMerchant.plan}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase text-muted-foreground">
                Active agents
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {inspectingMerchant.activeAgentCount}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase text-muted-foreground">Created</dt>
              <dd className="mt-1 font-medium text-foreground">
                {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                  new Date(inspectingMerchant.createdAt),
                )}
              </dd>
            </div>
          </dl>
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
