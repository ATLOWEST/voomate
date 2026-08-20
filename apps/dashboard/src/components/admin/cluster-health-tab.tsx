'use client';

import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';

export function ClusterHealthTab() {
  return (
    <Panel>
      <PanelHeader
        title="Production monitoring"
        description="This page will show CloudWatch alarms and ECS service health once the AWS application services are deployed."
      />
      <PanelBody>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4 text-[13px] leading-6 text-muted-foreground">
          No invented uptime, latency, or audit entries are shown here. The public landing site is
          live on AWS. Dashboard, API, and voice containers are still in the secure release stage,
          so there are no production container metrics to report yet.
        </div>
      </PanelBody>
    </Panel>
  );
}
