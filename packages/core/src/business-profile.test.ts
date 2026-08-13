import { describe, expect, it } from 'vitest';
import { inferBusinessProfile } from './business-profile.js';

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
