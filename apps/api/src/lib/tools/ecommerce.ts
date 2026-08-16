import { z } from 'zod';
import { registerTool } from './registry.js';

export const registerEcommerceTools = () => {
  registerTool({
    name: 'check_order_status',
    implementation: 'placeholder',
    description: 'Check the current shipping status of an e-commerce order using the order ID.',
    provider: 'shopify',
    schema: z.object({
      orderId: z.string().describe('The unique order ID, e.g. ORD-12345'),
    }),
    execute: async (input, ctx) => {
      // In a real implementation, this would fetch from Shopify/WooCommerce using ctx.config
      console.log(
        `[Tool] check_order_status executing for order ${input.orderId} in org ${ctx.organizationId}`,
      );

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Mock response
      return {
        orderId: input.orderId,
        status: 'shipped',
        trackingNumber: 'AWB99887766',
        carrier: 'BlueDart',
        estimatedDelivery: 'Tomorrow by 8 PM',
      };
    },
  });

  registerTool({
    name: 'search_products',
    implementation: 'placeholder',
    description:
      'Search the store catalogue for products matching a query (e.g. category, color, price).',
    provider: 'shopify',
    schema: z.object({
      query: z.string().describe('The search query, e.g. "red sneakers under 2000"'),
      limit: z.number().optional().describe('Max number of results to return. Default 3.'),
    }),
    execute: async (input, ctx) => {
      console.log(
        `[Tool] search_products executing for query "${input.query}" in org ${ctx.organizationId}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 600));

      return {
        results: [
          { id: 'p1', name: 'Crimson Running Shoes', price: '₹1,499', inStock: true },
          { id: 'p2', name: 'Maroon Casual Sneakers', price: '₹1,899', inStock: false },
        ],
      };
    },
  });
};
