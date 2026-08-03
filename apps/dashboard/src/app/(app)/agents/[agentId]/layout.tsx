import type { ReactNode } from 'react';
import { AgentShell } from '@/components/agent/shell';

export default async function AgentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  return <AgentShell agentId={agentId}>{children}</AgentShell>;
}
