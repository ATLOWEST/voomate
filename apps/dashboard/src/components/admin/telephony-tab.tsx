'use client';

import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';

export function TelephonyTab() {
  return (
    <Panel>
      <PanelHeader
        title="Voice sessions"
        description="Live WebRTC and phone-session telemetry will appear here after the AWS voice edge is deployed."
      />
      <PanelBody>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4 text-[13px] leading-6 text-muted-foreground">
          No live sessions yet. Sample call rooms and SIP metrics have been removed because they
          were not real customer traffic. Voice controls stay unavailable until the secure AWS voice
          runtime and session receipts are active.
        </div>
      </PanelBody>
    </Panel>
  );
}
