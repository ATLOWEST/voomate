import type { Metadata } from 'next';
import { AgentGrid } from '@/components/ui/premium/agent-grid';

export const metadata: Metadata = { title: 'Agents' };

export default function AgentsPage() {
  return (
    <div className="flex-1 p-6 md:p-8 w-full max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-56px)]">
      <AgentGrid />
    </div>
  );
}
