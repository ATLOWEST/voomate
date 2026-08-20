'use client';

import { PageBody, PageHeader } from '@/components/shell/page-header';
import { AgentFleetTab } from '@/components/admin/agent-fleet-tab';

export default function SuperAdminAgentsPage() {
  return (
    <>
      <PageHeader
        title="Agent Fleet & Multimodal LLMs"
        description="Protected global inventory of real customer agents. Model changes remain inside each workspace."
      />
      <PageBody>
        <AgentFleetTab />
      </PageBody>
    </>
  );
}
