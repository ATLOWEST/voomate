'use client';

import { PageBody, PageHeader } from '@/components/shell/page-header';
import { VoiceStudioTab } from '@/components/admin/voice-studio-tab';

export default function SuperAdminVoiceStudioPage() {
  return (
    <>
      <PageHeader
        title="Voice Edge Studio"
        description="Direct WebRTC speech playground and real-time audio tester powered by the Pipecat cluster on port 7860."
      />
      <PageBody>
        <VoiceStudioTab />
      </PageBody>
    </>
  );
}
