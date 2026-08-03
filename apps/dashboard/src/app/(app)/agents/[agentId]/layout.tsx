import type { ReactNode } from 'react';
import { AgentTabs } from '@/components/shell/nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shell/page-header';

export default async function AgentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;

  // TODO(phase-1): GET /v1/agents/:id — a 404 here must render notFound(), not an empty
  // shell, so a guessed agent ID from another tenant is indistinguishable from a typo.
  return (
    <>
      <PageHeader
        title="Agent"
        description="Draft — not yet serving traffic."
        action={
          <div className="flex items-center gap-3">
            <Badge tone="caution">Draft</Badge>
            <Button variant="primary">Publish</Button>
          </div>
        }
        below={<AgentTabs agentId={agentId} />}
      />
      {children}
    </>
  );
}
