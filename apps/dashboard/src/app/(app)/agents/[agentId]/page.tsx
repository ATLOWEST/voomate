import { AgentOverview } from './overview';
import { WebAgentNicheSelection } from '@/components/agent/web-niche-selection';
import { ShopifyDashboard } from '@/components/agent/web/shopify-dashboard';

export default async function AgentOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ niche?: string }>;
}) {
  const { agentId } = await params;
  const { niche } = await searchParams;

  if (agentId === 'web') {
    if (niche === 'shopify') {
      return <ShopifyDashboard />;
    }
    if (niche === 'custom') {
      return <AgentOverview />;
    }
    // For Web Agent, the root page acts as the niche selection screen initially.
    return <WebAgentNicheSelection />;
  }

  return <AgentOverview />;
}
