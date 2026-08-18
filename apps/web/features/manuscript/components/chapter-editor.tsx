'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { ensureStableBlockIds, type ManuscriptDocument } from '@authorhub/manuscript';

const StableBlockAttributes = Extension.create({
  name: 'stableBlockAttributes',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'blockquote'],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-id'),
            renderHTML: (attributes) =>
              attributes.blockId ? { 'data-block-id': attributes.blockId as string } : {},
          },
        },
      },
    ];
  },
});

export function ChapterEditor({
  nodeId,
  initialContent,
  initialVersion,
}: {
  nodeId: string;
  initialContent: ManuscriptDocument;
  initialVersion: number;
}) {
  const versionRef = useRef(initialVersion);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error' | 'conflict'>('saved');
  const [message, setMessage] = useState('All changes saved');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, StableBlockAttributes],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'manuscript-editor',
        'aria-label': 'Chapter manuscript editor',
      },
    },
    onUpdate({ editor: currentEditor }) {
      setSaveState('saving');
      setMessage('Saving…');
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        const json = currentEditor.getJSON();
        const content = ensureStableBlockIds({
          version: 1,
          type: 'doc',
          content: (json.content ?? []) as never[],
        });

        try {
          const response = await fetch(`/api/manuscript/nodes/${nodeId}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ version: versionRef.current, content }),
          });
          const result = await response.json() as { version?: number; error?: string; code?: string };

          if (response.status === 409 || result.code === 'VERSION_CONFLICT') {
            setSaveState('conflict');
            setMessage('Newer changes exist. Reload before continuing.');
            return;
          }
          if (!response.ok || typeof result.version !== 'number') {
            throw new Error(result.error ?? 'Save failed.');
          }

          versionRef.current = result.version;
          setSaveState('saved');
          setMessage('All changes saved');
        } catch (error) {
          setSaveState('error');
          setMessage(error instanceof Error ? error.message : 'Unable to save.');
        }
      }, 700);
    },
  });

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!editor) return <div className="editor-loading">Loading editor…</div>;

  return (
    <div className="editor-frame">
      <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} aria-pressed={editor.isActive('bold')}>Bold</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} aria-pressed={editor.isActive('italic')}>Italic</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-pressed={editor.isActive('heading', { level: 2 })}>Heading</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-pressed={editor.isActive('blockquote')}>Quote</button>
        <span className={`save-state ${saveState}`}>{message}</span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
