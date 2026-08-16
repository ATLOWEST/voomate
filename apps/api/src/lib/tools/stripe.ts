import { z } from 'zod';
import { type VoomateToolContext } from './registry.js';

export const createStripePaymentLinkTool = {
  name: 'create_stripe_payment_link',
  implementation: 'placeholder' as const,
  description:
    'Generates a secure Stripe payment link to collect a payment in USD or global currencies.',
  provider: 'stripe' as const,
  schema: z.object({
    amount: z.number().describe('The amount to collect (in smallest currency unit, e.g. cents).'),
    currency: z.string().describe('The 3-letter currency code (e.g. "usd", "eur").'),
    description: z.string().describe('The description of what this payment is for.'),
  }),
  execute: async (
    input: { amount: number; currency: string; description: string },
    ctx: VoomateToolContext,
  ) => {
    console.log(
      `[Tool] create_stripe_payment_link executing for ${input.amount} ${input.currency} in org ${ctx.organizationId}`,
    );

    // Check if the integration has been configured
    if (!ctx.config || !ctx.config.stripeSecretKey) {
      // In a real scenario, this would return an error
    }

    // Mock API call to Stripe Payment Links API
    const paymentId = `cs_test_${Math.floor(Math.random() * 1000000)}`;
    return {
      status: 'created',
      paymentId: paymentId,
      paymentUrl: `https://buy.stripe.com/test_${paymentId}`,
      amount: input.amount / 100, // Format for user
      currency: input.currency.toUpperCase(),
      message: 'Stripe payment link generated successfully. Send this URL to the customer.',
    };
  },
};

export const checkStripePaymentStatusTool = {
  name: 'check_stripe_payment_status',
  implementation: 'placeholder' as const,
  description: 'Checks if a previously generated Stripe payment session has been paid.',
  provider: 'stripe' as const,
  schema: z.object({
    paymentId: z.string().describe('The unique checkout session ID (e.g. cs_test_123456).'),
  }),
  execute: async (input: { paymentId: string }, ctx: VoomateToolContext) => {
    console.log(
      `[Tool] check_stripe_payment_status executing for ${input.paymentId} in org ${ctx.organizationId}`,
    );

    const isPaid = Math.random() > 0.5;

    return {
      paymentId: input.paymentId,
      status: isPaid ? 'complete' : 'open',
      amount_paid: isPaid ? 5000 : 0,
    };
  },
};
