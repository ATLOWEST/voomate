'use client';

import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';

export function VoiceStudioTab() {
  return (
    <Panel>
      <PanelHeader
        title="Voice test studio"
        description="A real voice test can only start after an active agent, an approved browser origin, and the AWS voice edge are available."
      />
      <PanelBody>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4 text-[13px] leading-6 text-muted-foreground">
          The old local `127.0.0.1` voice iframe has been removed. It could never work for a
          customer and it exposed a misleading production control. The final studio will use a
          short-lived, origin-bound session token from the deployed voice edge.
        </div>
      </PanelBody>
    </Panel>
  );
}
