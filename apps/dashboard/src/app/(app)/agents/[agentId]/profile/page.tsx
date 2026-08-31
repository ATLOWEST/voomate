'use client';

import type { BusinessOperatingProfile, BusinessProfileEvidence } from '@voomate/core';
import { CheckCircle2, ScanSearch, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useAgent } from '@/components/agent/shell';
import { PageBody } from '@/components/shell/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { EmptyState } from '@/components/ui/empty-state';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { api } from '@/lib/api';
import { useApiAction, useApiQuery } from '@/lib/hooks';

interface ProfileVersion {
  id: string;
  revision: number;
  status: 'proposed' | 'approved' | 'rejected' | 'retired';
  profile: BusinessOperatingProfile;
  changeSummary: string;
  createdAt: string;
  approvedAt: string | null;
}

interface ProfileResponse {
  approved: ProfileVersion | null;
  versions: ProfileVersion[];
  evidence: Array<BusinessProfileEvidence & { profileVersionId: string; id: string }>;
}

interface DiscoveryResponse {
  version: ProfileVersion;
  discovery: {
    version: string;
    confidence: number;
    interactionModes: string[];
    intents: Array<{ id: string; name: string; priority: number; confidence: number }>;
    unknowns: string[];
  };
}

const readable = (value: string): string => value.replaceAll('_', ' ');

const dateTime = (value: string | null): string =>
  value === null
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

export default function BusinessProfilePage() {
  const { agent } = useAgent();
  const query = useApiQuery<ProfileResponse>('/v1/business-profile');
  const create = useApiAction(async (auth) => {
    await api.post<DiscoveryResponse>(
      `/v1/business-profile/discover/${agent.id}/proposals`,
      undefined,
      auth,
    );
  });
  const approve = useApiAction(async (auth, versionId: string) => {
    await api.post(`/v1/business-profile/${versionId}/approve`, undefined, auth);
  });
  const reject = useApiAction(async (auth, versionId: string) => {
    await api.post(`/v1/business-profile/${versionId}/reject`, undefined, auth);
  });

  const versions = query.data?.versions ?? [];
  const proposed = versions.find(({ status }) => status === 'proposed') ?? null;
  const approved = query.data?.approved ?? null;
  const selected = proposed ?? approved;
  const selectedEvidence = selected
    ? (query.data?.evidence ?? []).filter(
        ({ profileVersionId }) => profileVersionId === selected.id,
      )
    : [];
  const error = create.error ?? approve.error ?? reject.error ?? query.error;

  const runDiscovery = async () => {
    if (await create.run()) query.refetch();
  };
  const approveProposal = async () => {
    if (proposed && (await approve.run(proposed.id))) query.refetch();
  };
  const rejectProposal = async () => {
    if (proposed && (await reject.run(proposed.id))) query.refetch();
  };

  return (
    <PageBody>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-accent-700">Business Operating Profile</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            What Voomate understands
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            Build a proposal from your crawled public website. Review it before it affects how this
            agent responds; discovery never enables tools, writes, or permissions by itself.
          </p>
        </div>
        <Button
          variant="primary"
          loading={create.busy}
          icon={<ScanSearch className="size-4" />}
          onClick={runDiscovery}
        >
          Analyze website
        </Button>
      </div>

      {error !== undefined && (
        <Callout tone="critical" title="Could not update the business profile">
          {error}
        </Callout>
      )}

      {query.loading && <p className="text-[14px] text-muted-foreground">Loading profile…</p>}

      {!query.loading && selected === null && (
        <EmptyState
          title="No profile proposed yet"
          description="First add and finish crawling a website in Knowledge. Then analyze it here to create a reviewable proposal."
          action={
            <Button
              loading={create.busy}
              onClick={runDiscovery}
              icon={<ScanSearch className="size-4" />}
            >
              Analyze website
            </Button>
          }
        />
      )}

      {selected !== null && (
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title={`Revision ${selected.revision}`}
              description={selected.changeSummary}
              action={
                <Badge tone={selected.status === 'approved' ? 'positive' : 'caution'}>
                  {selected.status}
                </Badge>
              }
            />
            <PanelBody>
              {selected.status === 'proposed' && (
                <Callout tone="caution" title="Owner review required">
                  This proposal is not active. Approval applies the profile to non-archived agents
                  in this workspace and refreshes their configuration revision.
                </Callout>
              )}
              {selected.status === 'approved' && (
                <Callout tone="positive" title="Active profile">
                  Approved {dateTime(selected.approvedAt)}. This agent receives an allowed,
                  purpose-specific view when it answers customer requests.
                </Callout>
              )}

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <ProfileList
                  title="Customer intents"
                  values={selected.profile.customerIntents.map(
                    ({ id, name, priority }) => `${name} (${id}, priority ${priority})`,
                  )}
                  empty="No customer intent was confidently inferred."
                />
                <ProfileList
                  title="Business entities"
                  values={selected.profile.entities.map(({ name }) => readable(name))}
                  empty="No public entity shape was inferred."
                />
                <ProfileList
                  title="Connected capabilities"
                  values={selected.profile.capabilities.map(({ name }) => name)}
                  empty="None. Website discovery cannot grant a capability."
                />
                <ProfileList
                  title="Configured workflows"
                  values={selected.profile.workflows.map(
                    ({ name, version }) => `${name} (v${version})`,
                  )}
                  empty="None. Workflows are added only after their policy and evaluation checks."
                />
              </div>

              {selected.status === 'proposed' && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    variant="primary"
                    loading={approve.busy}
                    icon={<CheckCircle2 className="size-4" />}
                    onClick={approveProposal}
                  >
                    Approve profile
                  </Button>
                  <Button
                    variant="secondary"
                    loading={reject.busy}
                    icon={<XCircle className="size-4" />}
                    onClick={rejectProposal}
                  >
                    Reject proposal
                  </Button>
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="When live data is needed"
              description="Website content can describe products, policies, and services. Current order status, inventory, appointments, and account data must come from a separately verified read-only connection."
            />
            <PanelBody>
              <Link
                href="/integrations"
                className="inline-flex h-9 items-center rounded-lg bg-[var(--surface-sunken)] px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-[var(--surface-hover)]"
              >
                Connect live business data
              </Link>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Evidence"
              description="These are the public pages and signals used to make the proposal. They are evidence, not instructions."
            />
            <PanelBody>
              {selectedEvidence.length === 0 ? (
                <p className="text-[14px] text-muted-foreground">No evidence records found.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {selectedEvidence.map((item) => (
                    <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[13px] font-medium text-foreground">
                          {readable(item.section)}
                        </p>
                        <Badge tone={item.confidence >= 0.7 ? 'positive' : 'caution'}>
                          {Math.round(item.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <p className="mt-1 break-all text-[12px] leading-relaxed text-muted-foreground">
                        {item.sourceReference}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </PanelBody>
          </Panel>
        </div>
      )}
    </PageBody>
  );
}

function ProfileList({ title, values, empty }: { title: string; values: string[]; empty: string }) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
      {values.length === 0 ? (
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-[13px] text-muted-foreground">
          {values.map((value) => (
            <li key={value}>• {value}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
