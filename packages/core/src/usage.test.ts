import { describe, expect, it } from 'vitest';
import { buildUsageBreakdown, estimatedProviderCostUsd } from './usage.js';

describe('usage rate card', () => {
  it('prices provider tokens without inventing a tool-call charge', () => {
    const totals = {
      llm_input_tokens: 1_000_000,
      llm_output_tokens: 1_000_000,
      embedding_input_tokens: 1_000_000,
      tool_calls: 25,
    } as const;

    expect(estimatedProviderCostUsd(totals)).toBeCloseTo(4.02, 6);
    const tools = buildUsageBreakdown(totals).find((meter) => meter.kind === 'tool_calls');
    expect(tools).toMatchObject({ quantity: 25, billingMode: 'included' });
    expect(tools?.estimatedProviderCostUsd).toBe(0);
  });

  it('clamps invalid negative totals before presenting them', () => {
    const input = buildUsageBreakdown({ agent_runs: -5 }).find(
      (meter) => meter.kind === 'agent_runs',
    );
    expect(input?.quantity).toBe(0);
  });
});
