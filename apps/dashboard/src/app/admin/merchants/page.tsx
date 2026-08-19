'use client';

import { PageBody, PageHeader } from '@/components/shell/page-header';
import { MerchantsTab } from '@/components/admin/merchants-tab';

export default function SuperAdminMerchantsPage() {
  return (
    <>
      <PageHeader
        title="Merchants & Workspaces"
        description="Provision customer workspaces, assign plan tiers, and manage client storefront quotas."
      />
      <PageBody>
        <MerchantsTab />
      </PageBody>
    </>
  );
}
