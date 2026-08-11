import { z } from 'zod';
import { type VoomateToolContext } from './registry.js';

export const generatePaymentLinkTool = {
  name: 'generate_payment_link',
  description:
    'Generates a secure Razorpay payment link or UPI link to collect a deposit or payment from a customer.',
  provider: 'razorpay' as const,
  schema: z.object({
    amount: z.number().describe('The amount to collect in INR.'),
    description: z
      .string()
      .describe('The description of what this payment is for (e.g. Haircut Deposit).'),
    customerPhone: z
      .string()
      .optional()
      .describe('The customer phone number (if available) to pre-fill the Razorpay checkout.'),
  }),
  execute: async (
    input: { amount: number; description: string; customerPhone?: string },
    ctx: VoomateToolContext,
  ) => {
    console.log(
      `[Tool] generate_payment_link executing for ₹${input.amount} in org ${ctx.organizationId}`,
    );

    // Check if the integration has been configured
    if (!ctx.config || (!ctx.config.razorpayKeyId && !ctx.config.razorpayKeySecret)) {
      // In a real scenario, this would return an error
      // return { error: "Razorpay is not connected. Please connect it in the dashboard." };
    }

    // Mock API call to Razorpay Payment Links API
    const paymentId = `plink_${Math.floor(Math.random() * 1000000)}`;
    return {
      status: 'created',
      paymentId: paymentId,
      paymentUrl: `https://rzp.io/i/${paymentId}`,
      amount: input.amount,
      currency: 'INR',
      message: 'Payment link generated successfully. Send this URL to the customer.',
    };
  },
};

export const checkPaymentStatusTool = {
  name: 'check_payment_status',
  description:
    'Checks if a previously generated Razorpay payment link has been paid by the customer.',
  provider: 'razorpay' as const,
  schema: z.object({
    paymentId: z.string().describe('The unique payment link ID (e.g. plink_123456).'),
  }),
  execute: async (input: { paymentId: string }, ctx: VoomateToolContext) => {
    console.log(
      `[Tool] check_payment_status executing for ${input.paymentId} in org ${ctx.organizationId}`,
    );

    // Mock API call to Razorpay API
    // Simulate a 50% chance of being paid for demo purposes
    const isPaid = Math.random() > 0.5;

    return {
      paymentId: input.paymentId,
      status: isPaid ? 'paid' : 'pending',
      amount_paid: isPaid ? 500 : 0,
      timestamp: isPaid ? new Date().toISOString() : null,
    };
  },
};
