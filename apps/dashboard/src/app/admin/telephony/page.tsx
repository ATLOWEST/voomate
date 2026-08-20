'use client';

import { PageBody, PageHeader } from '@/components/shell/page-header';
import { TelephonyTab } from '@/components/admin/telephony-tab';

export default function SuperAdminTelephonyPage() {
  return (
    <>
      <PageHeader
        title="Telephony & Streams"
        description="Live voice sessions will appear after the AWS voice edge is deployed."
      />
      <PageBody>
        <TelephonyTab />
      </PageBody>
    </>
  );
}
