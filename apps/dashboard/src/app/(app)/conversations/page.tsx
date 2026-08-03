import type { Metadata } from 'next';
import { PageBody, PageHeader } from '@/components/shell/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Panel } from '@/components/ui/panel';

export const metadata: Metadata = { title: 'Conversations' };

export default function ConversationsPage() {
  return (
    <>
      <PageHeader
        title="Conversations"
        description="Transcripts of what visitors asked and how the agent answered, with the sources it cited. Audio is not retained — only the transcript."
      />
      <PageBody>
        <Panel>
          <EmptyState
            title="No conversations yet"
            description="Once your agent is published and installed, conversations appear here within a few seconds of ending."
          />
        </Panel>
      </PageBody>
    </>
  );
}
