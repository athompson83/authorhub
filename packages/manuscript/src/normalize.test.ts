import { describe, expect, it } from 'vitest';
import { manuscriptDocumentSchema } from './schema';
import { ensureStableBlockIds } from './normalize';

describe('ensureStableBlockIds', () => {
  it('assigns missing ids without replacing existing block ids', () => {
    const result = ensureStableBlockIds({
      version: 1,
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'New paragraph' }] },
        {
          type: 'heading',
          attrs: { blockId: 'blk_existingblockidentifier01', level: 2 },
          content: [{ type: 'text', text: 'Existing heading' }],
        },
      ],
    });

    expect(result.content[0]?.attrs?.blockId).toMatch(/^blk_/);
    expect(result.content[1]?.attrs?.blockId).toBe('blk_existingblockidentifier01');
    expect(manuscriptDocumentSchema.safeParse(result).success).toBe(true);
  });
});
