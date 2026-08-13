import { describe, expect, it } from 'vitest';
import { buildResponsePresentation } from './presentation';

describe('response presentation', () => {
  it('turns complex numbered content into a scannable list', () => {
    const result = buildResponsePresentation(
      'Here are the plans:\n1. Starter is $19 per month.\n2. Growth is $49 per month.\n3. Scale is custom priced.',
    );
    expect(result.blocks).toContainEqual({
      type: 'list',
      style: 'number',
      items: ['Starter is $19 per month.', 'Growth is $49 per month.', 'Scale is custom priced.'],
    });
  });

  it('recognizes product-shaped tool data without an industry switch', () => {
    const result = buildResponsePresentation('This one is in stock.', [
      {
        name: 'Blue Jacket',
        imageUrl: 'https://cdn.example.test/jacket.jpg',
        price: 79,
        currency: 'USD',
        inventory: 4,
      },
    ]);
    expect(result.blocks).toContainEqual(
      expect.objectContaining({
        type: 'entity_card',
        entity: 'product',
        title: 'Blue Jacket',
        price: '$79.00',
      }),
    );
  });

  it('does not misclassify ordinary clinic data as a product', () => {
    const result = buildResponsePresentation('Dr. Rao is available today.', [
      { name: 'Dr. Rao', specialty: 'Cardiology', phone: '555-0100' },
    ]);
    expect(result.blocks.some((block) => block.type === 'entity_card')).toBe(false);
  });

  it('recognizes service and appointment shapes through the same renderer', () => {
    const result = buildResponsePresentation('I found these options.', [
      { name: 'Consultation', duration: '30 minutes', price: 50, currency: 'USD' },
      {
        title: 'Consultation slot',
        startTime: '2026-08-14T10:00:00Z',
        endTime: '2026-08-14T10:30:00Z',
        available: true,
      },
    ]);
    expect(
      result.blocks.some((block) => block.type === 'entity_card' && block.entity === 'service'),
    ).toBe(true);
    expect(
      result.blocks.some((block) => block.type === 'entity_card' && block.entity === 'appointment'),
    ).toBe(true);
  });
});
