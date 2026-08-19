'use client';

import { PageBody, PageHeader } from '@/components/shell/page-header';
import { ClusterHealthTab } from '@/components/admin/cluster-health-tab';

export default function SuperAdminHealthPage() {
  return (
    <>
      <PageHeader
        title="Cluster Health & Audit Trace"
        description="Operational health matrix for all edge and backend microservices along with real-time audit logs."
      />
      <PageBody>
        <ClusterHealthTab />
      </PageBody>
    </>
  );
}
