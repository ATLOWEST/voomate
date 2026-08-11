import { ShopifyKnowledge } from '@/components/agent/web/shopify-knowledge';

export default async function AgentKnowledgePage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ niche?: string }>;
}) {
  const { agentId } = await params;
  const { niche } = await searchParams;

  if (agentId === 'web' && niche === 'shopify') {
    return <ShopifyKnowledge />;
  }

  return <div>Agent Knowledge (Default) coming soon</div>;
}
