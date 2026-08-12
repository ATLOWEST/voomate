import { describe, expect, it } from 'vitest';
import { shouldRetrieveKnowledge } from './knowledge';

describe('Web Agent knowledge routing', () => {
  it('skips paid embeddings for pure social turns', () => {
    expect(shouldRetrieveKnowledge('Hi, can you hear me?')).toBe(false);
    expect(shouldRetrieveKnowledge('Thanks!')).toBe(false);
  });

  it('uses conversation history instead of RAG for memory follow-ups', () => {
    expect(shouldRetrieveKnowledge('What color did I just tell you was my favorite?')).toBe(false);
    expect(shouldRetrieveKnowledge('Remember that my preferred day is Tuesday.')).toBe(false);
  });

  it('retrieves knowledge for real product questions', () => {
    expect(shouldRetrieveKnowledge('What is Voomate actually about?')).toBe(true);
    expect(shouldRetrieveKnowledge('Can customers speak with the widget?')).toBe(true);
  });
});
