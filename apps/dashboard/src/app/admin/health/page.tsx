'use client';

import { PageBody, PageHeader } from '@/components/shell/page-header';
import { ClusterHealthTab } from '@/components/admin/cluster-health-tab';

export default function SuperAdminHealthPage() {
  return (
    <>
      <PageHeader
        title="Cluster Health & Audit Trace"
        description="AWS monitoring will appear here only after the application runtime is deployed."
      />
      <PageBody>
        <ClusterHealthTab />
      </PageBody>
    </>
  );
}
