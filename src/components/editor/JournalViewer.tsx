import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

interface JournalViewerProps {
  content: string;
}

export const JournalViewer: React.FC<JournalViewerProps> = ({ content }) => {
  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit,
      Markdown,
    ],
    content,
  });

  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) {
    return <div className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="font-body-md text-body-md text-on-surface leading-relaxed [&_.ProseMirror]:outline-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:my-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2 [&_strong]:font-bold [&_em]:italic">
      <EditorContent editor={editor} />
    </div>
  );
};
