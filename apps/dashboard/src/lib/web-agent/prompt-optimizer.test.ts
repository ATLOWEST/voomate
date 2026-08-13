import { describe, expect, it } from 'vitest';
import { compactPromptContext } from './prompt-optimizer';

describe('prompt compaction', () => {
  it('removes duplicate knowledge and bounds repeated context', () => {
    const content = 'Verified product fact. '.repeat(200);
    const result = compactPromptContext({
      history: Array.from({ length: 12 }, (_, index) => ({
        role: index % 2 ? ('agent' as const) : ('visitor' as const),
        content: `Turn ${index}: ${'context '.repeat(200)}`,
      })),
      knowledge: Array.from({ length: 8 }, (_, index) => ({
        title: `Chunk ${index}`,
        url: null,
        content,
      })),
    });
    expect(result.history).toHaveLength(8);
    expect(result.knowledge).toHaveLength(1);
    expect(result.metrics.afterTokens).toBeLessThan(result.metrics.beforeTokens * 0.5);
    expect(result.metrics.savedTokens).toBeGreaterThan(0);
  });
});
