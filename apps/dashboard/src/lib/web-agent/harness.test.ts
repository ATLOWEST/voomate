import { describe, expect, it } from 'vitest';
import { loadWebAgentHarness } from './harness';
import { selectNovaModel } from './nova';

describe('Web Agent behavior harness', () => {
  it('loads the active version and substitutes public identity', async () => {
    const harness = await loadWebAgentHarness({
      businessName: 'Acme',
      agentName: 'Ava',
    });
    expect(harness.version).toBe('2.3.0');
    expect(harness.instructions).toContain("You are Ava, Acme's customer assistant.");
    expect(harness.instructions).toContain('stock introduction');
    expect(harness.instructions).toContain('never as a script');
    expect(harness.instructions).toContain('not supported by the available actions');
    expect(harness.instructions).toContain('The customer never sees');
    expect(harness.instructions).toContain('dense text wall');
    expect(harness.instructions).not.toContain('{business_name}');
  });

  it('uses Pro for actions and Micro for low-risk conversation', () => {
    expect(selectNovaModel('Check order DEMO-1001')).toContain('amazon.nova-pro');
    expect(selectNovaModel('What is your name?')).toContain('amazon.nova-micro');
  });

  it('uses Pro whenever an image is attached', () => {
    expect(selectNovaModel('What do you see?', 1)).toContain('amazon.nova-pro');
  });

  it('uses Pro for answers grounded in tenant knowledge', () => {
    expect(selectNovaModel('What does Voomate do?', 0, 2)).toContain('amazon.nova-pro');
  });
});
