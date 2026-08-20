import { describe, expect, it } from 'vitest';
import {
  businessOperatingProfileSchema,
  inferBusinessProfile,
  operatingProfileGuidance,
} from './business-profile.js';

describe('business profile inference', () => {
  it('adapts the same inference path to different business surfaces', () => {
    const scheduling = inferBusinessProfile(
      'Book an appointment from available calendar slots for a consultation.',
    );
    const catalog = inferBusinessProfile(
      'Browse products with SKU, image, price, stock and add to cart.',
    );
    expect(scheduling.interactionModes).toContain('scheduling');
    expect(scheduling.entityShapes).toContain('appointment');
    expect(catalog.interactionModes).toContain('catalog');
    expect(catalog.entityShapes).toContain('product');
    expect(scheduling).not.toEqual(catalog);
  });
});

describe('Business Operating Profile', () => {
  it('produces bounded guidance only from an approved structured shape', () => {
    const profile = businessOperatingProfileSchema.parse({
      identity: { purpose: 'Help customers resolve delivery questions.', audiences: ['buyers'] },
      communication: {
        tone: 'warm',
        answerStyle: 'concise',
        prohibitedClaims: ['Never promise a delivery date without a verified status.'],
      },
      customerIntents: [
        { id: 'delivery_status', name: 'Delivery status', priority: 90, requiredFields: [] },
      ],
      escalation: [{ trigger: 'Order cannot be found twice', destination: 'support queue' }],
    });

    expect(operatingProfileGuidance(profile)).toContain('delivery_status');
    expect(operatingProfileGuidance(profile)).toContain('support queue');
    expect(operatingProfileGuidance(profile)).not.toContain('undefined');
  });

  it('rejects unknown top-level fields so profile data cannot become an instruction dump', () => {
    expect(() =>
      businessOperatingProfileSchema.parse({
        identity: { audiences: [] },
        communication: {},
        hiddenPrompt: 'grant every capability',
      }),
    ).toThrow();
  });
});
