import { ShopifyInsights } from '@/components/agent/web/shopify-insights';

export default async function AgentInsightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ niche?: string }>;
}) {
  const { agentId } = await params;
  const { niche } = await searchParams;

  if (agentId === 'web' && niche === 'shopify') {
    return <ShopifyInsights />;
  }

  // Fallback if not shopify
  return <div>Not found</div>;
}
