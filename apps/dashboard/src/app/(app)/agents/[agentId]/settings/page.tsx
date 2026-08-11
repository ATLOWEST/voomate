import { ShopifySettings } from '@/components/agent/web/shopify-settings';

export default async function AgentSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ niche?: string }>;
}) {
  const { agentId } = await params;
  const { niche } = await searchParams;

  if (agentId === 'web' && niche === 'shopify') {
    return <ShopifySettings />;
  }

  return <div>Agent Settings (Default) coming soon</div>;
}
