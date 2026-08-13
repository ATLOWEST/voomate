import { describe, expect, it, vi } from 'vitest';
import {
  createCustomerFacingStream,
  internalLanguageViolations,
  sanitizeCustomerFacingReply,
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
});
