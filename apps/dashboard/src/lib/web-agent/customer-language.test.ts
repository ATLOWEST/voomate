import { describe, expect, it, vi } from 'vitest';
import {
  createCustomerFacingStream,
  internalLanguageViolations,
  sanitizeCustomerFacingReply,
  validateCustomerFacingReply,
} from './customer-language';

describe('customer language boundary', () => {
  it('removes internal/admin phrasing', () => {
    const result = sanitizeCustomerFacingReply('I need to find user details before I can help.');
    expect(result).toBe('I’ll check that for you before I can help.');
    expect(internalLanguageViolations(result)).toHaveLength(0);
    const thirdPerson = sanitizeCustomerFacingReply(
      'I need to ask the user for the order ID and email.',
    );
    expect(thirdPerson).toBe('Please share the order ID and email.');
    expect(internalLanguageViolations(thirdPerson)).toHaveLength(0);
  });

  it('guards complete sentences before streaming them', async () => {
    const emit = vi.fn();
    const stream = createCustomerFacingStream(emit);
    await stream.push('I need to find user ');
    expect(emit).not.toHaveBeenCalled();
    await stream.push('details. Please wait.');
    await stream.flush();
    expect(emit.mock.calls.flat().join('')).not.toContain('find user details');
  });

  it('turns internal vague-request language into a customer clarification', () => {
    const result = sanitizeCustomerFacingReply(
      "The User's question is too vague and requires more specific information to be answered.",
    );
    expect(result).toMatch(/tell me a little more/i);
    expect(internalLanguageViolations(result)).toHaveLength(0);
  });

  it('does not stream an echo of the visitor message as an answer', async () => {
    const emit = vi.fn();
    const stream = createCustomerFacingStream(emit, {
      visitorMessage: 'Why is it so serious or what?',
    });
    await stream.push('Why is it so serious or what?');
    await stream.flush();
    const visible = emit.mock.calls.flat().join('');
    expect(visible).not.toBe('Why is it so serious or what?');
    expect(visible).toMatch(/tell me a little more/i);
    expect(
      validateCustomerFacingReply('Why is it so serious or what?', 'Why is it so serious or what?'),
    ).toMatchObject({ corrected: true, reason: 'echo' });
  });

  it('reports a guard intervention without exposing the original response', async () => {
    const corrections: string[] = [];
    const stream = createCustomerFacingStream(undefined, {
      visitorMessage: 'What can you do?',
      onCorrection: (reason) => corrections.push(reason),
    });
    await stream.push('What can you do?');
    await stream.flush();
    expect(corrections).toEqual(['echo']);
  });

  it('preserves structured line breaks without reporting a repair', () => {
    const structured = 'Starter\n- 100 conversations\n\nGrowth\n- 5,000 conversations\n';
    expect(validateCustomerFacingReply(structured)).toEqual({
      reply: structured.trim(),
      corrected: false,
    });
  });
});
