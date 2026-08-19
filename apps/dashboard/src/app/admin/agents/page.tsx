'use client';

import { PageBody, PageHeader } from '@/components/shell/page-header';
import { AgentFleetTab } from '@/components/admin/agent-fleet-tab';

export default function SuperAdminAgentsPage() {
  return (
    <>
      <PageHeader
        title="Agent Fleet & Multimodal LLMs"
        description="Global inventory of all active customer agents, tool orchestration, and AWS Bedrock model routing."
      />
      <PageBody>
        <AgentFleetTab />
      </PageBody>
    </>
  );
}
