import { describe, expect, it } from 'vitest';
import { decideDialogue } from './dialogue-manager';

const context = { agentName: 'Mira', businessName: 'Voomate', previousVisitorMessages: [] };

describe('dialogue manager', () => {
  it('answers social turns naturally without spending a model call', () => {
    expect(decideDialogue({ ...context, message: 'Hi, can you hear me?' })).toMatchObject({
      kind: 'social',
      reply: 'Yes, I can hear you.',
      escalate: false,
    });
    expect(decideDialogue({ ...context, message: 'Hi there' })).toMatchObject({
      kind: 'social',
      reason: 'greeting',
    });
  });

  it('answers a name question once without a stock closing', () => {
    expect(decideDialogue({ ...context, message: 'what is your name' })).toEqual({
      kind: 'identity',
      reply: 'I’m Mira, Voomate’s assistant.',
      escalate: false,
      reason: 'identity',
    });
    expect(decideDialogue({ ...context, message: 'Who are you?' })).toMatchObject({
      kind: 'identity',
      reason: 'identity',
    });
  });

  it('stores an explicit memory turn without spending a model call', () => {
    expect(
      decideDialogue({
        ...context,
        message: 'Please remember that my favorite color is cobalt blue.',
      }),
    ).toEqual({
      kind: 'memory_ack',
      reply: 'Got it. I’ll remember that my favorite color is cobalt blue.',
      escalate: false,
      reason: 'explicit_memory',
    });
  });

  it('offers useful help on the first ordinary handoff request without claiming success', () => {
    const decision = decideDialogue({ ...context, message: 'Can you connect me to a human?' });
    expect(decision.kind).toBe('assist_first');
    expect(decision.escalate).toBe(false);
    expect('reply' in decision && decision.reply).not.toMatch(/connected|notified|will contact/i);
  });

  it('escalates when the visitor asks for a person again', () => {
    const decision = decideDialogue({
      ...context,
      message: 'No, I still need a human representative',
      previousVisitorMessages: ['Can I speak to someone?'],
    });
    expect(decision).toMatchObject({
      kind: 'handoff',
      escalate: true,
      reason: 'repeated_handoff_request',
    });
  });

  it('escalates a serious issue on the first request', () => {
    const decision = decideDialogue({
      ...context,
      message: 'I have an unauthorized charge. Connect me to a person.',
    });
    expect(decision).toMatchObject({ kind: 'handoff', escalate: true, reason: 'serious_issue' });
  });

  it('escalates a serious issue even when the visitor does not explicitly ask for a human', () => {
    const decision = decideDialogue({
      ...context,
      message: 'There is an unauthorized charge on my account.',
    });
    expect(decision).toMatchObject({ kind: 'handoff', escalate: true, reason: 'serious_issue' });
  });
});
