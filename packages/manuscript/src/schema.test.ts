import { describe, expect, it } from 'vitest';
import { manuscriptDocumentSchema } from './schema';

describe('manuscriptDocumentSchema', () => {
  it('rejects addressable blocks without stable block ids', () => {
    const result = manuscriptDocumentSchema.safeParse({
      version: 1,
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    });

    expect(result.success).toBe(false);
  });

  it('round-trips a valid structured document', () => {
    const document = {
      version: 1,
      type: 'doc' as const,
      content: [
        {
          type: 'paragraph' as const,
          attrs: { blockId: 'blk_01JTESTAUTHORHUB000000000001' },
          content: [{ type: 'text' as const, text: 'Evidence stays addressable.' }],
        },
      ],
    };

    expect(manuscriptDocumentSchema.parse(document)).toEqual(document);
  });
});
