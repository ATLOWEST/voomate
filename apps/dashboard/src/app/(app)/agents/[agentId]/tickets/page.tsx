import { ShopifyTickets } from '@/components/agent/web/shopify-tickets';

export default async function AgentTicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ niche?: string }>;
}) {
  const { agentId } = await params;
  const { niche } = await searchParams;

  if (agentId === 'web' && niche === 'shopify') {
    return <ShopifyTickets />;
  }

  // Fallback if not shopify (assuming normal agents don't use this route yet)
  return <div>Not found</div>;
}
