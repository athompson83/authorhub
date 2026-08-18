import { describe, expect, it } from 'vitest';
import { extractBlockIndex } from './block-index';
import type { ManuscriptDocument } from './schema';

describe('extractBlockIndex', () => {
  it('produces ordered searchable text for addressable blocks', () => {
    const document: ManuscriptDocument = {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { blockId: 'blk_headingidentifier0001', level: 2 },
          content: [{ type: 'text', text: 'Evidence' }],
        },
        {
          type: 'paragraph',
          attrs: { blockId: 'blk_paragraphidentifier01' },
          content: [
            { type: 'text', text: 'Source-grounded ' },
            { type: 'text', text: 'writing.' },
          ],
        },
      ],
    };

    expect(extractBlockIndex(document)).toEqual([
      { blockId: 'blk_headingidentifier0001', blockType: 'heading', ordinal: 0, textContent: 'Evidence' },
      { blockId: 'blk_paragraphidentifier01', blockType: 'paragraph', ordinal: 1, textContent: 'Source-grounded writing.' },
    ]);
  });
});
