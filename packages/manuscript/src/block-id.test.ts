import { describe, expect, it } from 'vitest';
import { createBlockId, isBlockId } from './block-id';

describe('block ids', () => {
  it('creates unique stable manuscript block identifiers', () => {
    const first = createBlockId();
    const second = createBlockId();

    expect(first).not.toBe(second);
    expect(isBlockId(first)).toBe(true);
    expect(isBlockId(second)).toBe(true);
  });

  it('rejects arbitrary identifiers', () => {
    expect(isBlockId('paragraph-1')).toBe(false);
  });
});
