import { describe, expect, it } from 'vitest';
import {
  formatPublicOrderFallback,
  modelUsageFromTrace,
  prepareInlineConversation,
} from './bedrock-inline-agent';
import { checkOrderInputSchema } from './check-order-status';

describe('Bedrock Inline Agent deterministic tool fallback', () => {
  it('formats only the public order projection', () => {
    const reply = formatPublicOrderFallback({
      orderId: 'DEMO-1001',
      status: 'shipped',
      orderDate: '2026-08-11T00:00:00.000Z',
      estimatedDelivery: '2026-08-15T00:00:00.000Z',
      carrier: 'BlueDart',
      trackingNumber: 'DEMO-AWB-1001',
    });
    expect(reply).toContain('Order DEMO-1001 is shipped via BlueDart.');
    expect(reply).toContain('Tracking: DEMO-AWB-1001.');
    expect(reply).not.toContain('internal');
  });

  it('does not invent status when verification finds no order', () => {
    expect(formatPublicOrderFallback({ found: false })).toContain('couldn’t find an order');
  });

  it('treats missing lookup fields as recoverable input instead of an executable read', () => {
    expect(checkOrderInputSchema.safeParse({}).success).toBe(false);
    expect(
      checkOrderInputSchema.safeParse({ orderId: 'A-100', email: 'customer@example.com' }).success,
    ).toBe(true);
  });

  it('reads exact token usage from Bedrock orchestration traces', () => {
    expect(
      modelUsageFromTrace({
        trace: {
          orchestrationTrace: {
            modelInvocationOutput: {
              metadata: { usage: { inputTokens: 420, outputTokens: 73 } },
            },
          },
        },
      }),
    ).toEqual({ modelInvocations: 1, inputTokens: 420, outputTokens: 73 });
  });

  it('repairs an unanswered visitor turn before the next Bedrock request', () => {
    const result = prepareInlineConversation(
      [
        { role: 'visitor', content: 'First question' },
        { role: 'agent', content: 'First answer' },
        { role: 'visitor', content: 'Request that failed' },
      ],
      'Try the next request',
    );
    expect(result.messages.map(({ role }) => role)).toEqual(['user', 'assistant']);
    expect(result.inputText).toContain('Previous unanswered request:\nRequest that failed');
    expect(result.inputText).toContain('Current request:\nTry the next request');
  });
});
