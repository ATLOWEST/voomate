import { describe, expect, it } from 'vitest';
import { PublicTextStream, selectNovaModel } from './nova';

describe('Nova public streaming boundary', () => {
  it('removes private thinking even when tags are split across chunks', () => {
    const stream = new PublicTextStream();
    const visible = [
      stream.push('Here is the answer. <thin'),
      stream.push('king>private deliberation'),
      stream.push('</think'),
      stream.push('ing> Safe ending.'),
      stream.finish(),
    ].join('');
    expect(visible).toBe('Here is the answer. Safe ending.');
    expect(visible).not.toContain('private');
  });

  it('removes Nova response wrappers even when streamed in small pieces', () => {
    const stream = new PublicTextStream();
    const output = [
      stream.push('<res'),
      stream.push('ponse>Hello there.</res'),
      stream.push('ponse>'),
      stream.finish(),
    ].join('');

    expect(output).toBe('Hello there.');
  });

  it('holds a complete opening wrapper until it can be removed', () => {
    const stream = new PublicTextStream();
    const output = [
      stream.push('<response>'),
      stream.push('Loud and clear!'),
      stream.push('</response>'),
      stream.finish(),
    ].join('');

    expect(output).toBe('Loud and clear!');
  });

  it('keeps voice routing Amazon-only', () => {
    expect(selectNovaModel('Hello')).toContain('amazon.nova');
    expect(selectNovaModel('Check my order')).toContain('amazon.nova-pro');
  });

  it('uses Pro only when a follow-up depends on stored conversation context', () => {
    expect(selectNovaModel('What color did I just tell you?', 0, 0, 2)).toContain(
      'amazon.nova-pro',
    );
    expect(selectNovaModel('Thanks', 0, 0, 2)).toContain('amazon.nova-micro');
  });
});
