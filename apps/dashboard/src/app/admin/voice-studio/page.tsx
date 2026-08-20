'use client';

import { PageBody, PageHeader } from '@/components/shell/page-header';
import { VoiceStudioTab } from '@/components/admin/voice-studio-tab';

export default function SuperAdminVoiceStudioPage() {
  return (
    <>
      <PageHeader
        title="Voice Edge Studio"
        description="Production voice testing will use a short-lived session from the AWS voice edge."
      />
      <PageBody>
        <VoiceStudioTab />
      </PageBody>
    </>
  );
}
