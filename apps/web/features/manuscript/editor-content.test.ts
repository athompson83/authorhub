import { describe, expect, it } from 'vitest';
import { toEditorContent } from './editor-content';

it('converts canonical manuscript content without leaking the storage version field', () => {
  const editorContent = toEditorContent({
    version: 1,
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { blockId: 'blk_adaptertestidentifier01' },
        content: [{ type: 'text', text: 'Hello' }],
      },
    ],
  });

  expect(editorContent).toEqual({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { blockId: 'blk_adaptertestidentifier01' },
        content: [{ type: 'text', text: 'Hello' }],
      },
    ],
  });
  expect('version' in editorContent).toBe(false);
});
