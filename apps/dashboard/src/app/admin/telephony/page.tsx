'use client';

import { PageBody, PageHeader } from '@/components/shell/page-header';
import { TelephonyTab } from '@/components/admin/telephony-tab';

export default function SuperAdminTelephonyPage() {
  return (
    <>
      <PageHeader
        title="Telephony & Streams"
        description="Active WebRTC live audio rooms, SIP trunk connections, and Opus stream quality."
      />
      <PageBody>
        <TelephonyTab />
      </PageBody>
    </>
  );
}
