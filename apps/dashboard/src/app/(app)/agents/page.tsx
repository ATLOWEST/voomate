import type { Metadata } from 'next';
import { AgentsList } from './list';

export const metadata: Metadata = { title: 'Agents' };

// A thin server component so the page can export metadata; the list itself needs client state
// (the selected organization) that only exists in the browser.
export default function AgentsPage() {
  return <AgentsList />;
}
