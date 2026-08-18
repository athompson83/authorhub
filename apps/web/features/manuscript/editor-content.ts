import type { JSONContent } from '@tiptap/core';
import type { ManuscriptDocument } from '@authorhub/manuscript';

function copyNode(node: ManuscriptDocument['content'][number]): JSONContent {
  if (node.type === 'blockquote') {
    return {
      type: node.type,
      attrs: { ...node.attrs },
      content: node.content.map(copyNode),
    };
  }

  const result: JSONContent = {
    type: node.type,
    attrs: { ...node.attrs },
  };

  if (node.content) {
    result.content = node.content.map((textNode) => {
      const textResult: JSONContent = {
        type: 'text',
        text: textNode.text,
      };
      if (textNode.marks) {
        textResult.marks = textNode.marks.map((mark) => ({ type: mark.type }));
      }
      return textResult;
    });
  }

  return result;
}

export function toEditorContent(document: ManuscriptDocument): JSONContent {
  return {
    type: 'doc',
    content: document.content.map(copyNode),
  };
}
