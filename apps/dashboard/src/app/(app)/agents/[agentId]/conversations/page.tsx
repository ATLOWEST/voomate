import { ShopifyConversations } from '@/components/agent/web/shopify-conversations';

export default async function AgentConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ niche?: string }>;
}) {
  const { agentId } = await params;
  const { niche } = await searchParams;

  if (agentId === 'web' && niche === 'shopify') {
    return <ShopifyConversations />;
  }

  return <div>Agent Conversations (Default) coming soon</div>;
}
