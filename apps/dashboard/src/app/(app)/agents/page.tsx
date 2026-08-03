import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Panel } from '@/components/ui/panel';
import { PageBody, PageHeader } from '@/components/shell/page-header';

export const metadata: Metadata = { title: 'Agents' };

export default function AgentsPage() {
  // TODO(phase-1): GET /v1/agents with the session token and x-organization-id.
  const agents: never[] = [];

  return (
    <>
      <PageHeader
        title="Agents"
        description="Each agent has its own knowledge base, voice, and embed key. Most merchants need one; run separate agents when you have separate sites or separate audiences."
        action={<Button variant="primary">New agent</Button>}
      />
      <PageBody>
        <Panel>
          {agents.length === 0 && (
            <EmptyState
              title="No agents yet"
              description="Point an agent at your website and it will read the site, build a knowledge base, and be ready to answer questions in about ten minutes."
              action={<Button variant="primary">Create your first agent</Button>}
            />
          )}
        </Panel>
      </PageBody>
    </>
  );
}
