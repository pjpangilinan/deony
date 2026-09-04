import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

interface JournalEditorProps {
  initialContent?: string;
  onChange?: (markdown: string) => void;
  minHeightClass?: string;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  initialContent = '',
  onChange,
  minHeightClass = 'min-h-[300px]'
}) => {
  const [isSourceView, setIsSourceView] = useState(false);
  const [markdownContent, setMarkdownContent] = useState(initialContent);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const markdown = (editor.storage as unknown as Record<string, { getMarkdown: () => string }>).markdown.getMarkdown();
      setMarkdownContent(markdown);
      onChange?.(markdown);
    },
  });

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMarkdownContent(val);
    onChange?.(val);
  };

  const toggleView = () => {
    if (isSourceView && editor) {
      editor.commands.setContent(markdownContent);
    }
    setIsSourceView(!isSourceView);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-tertiary rounded-lg overflow-hidden flex flex-col bg-surface-container-lowest">
      {/* Toolbar */}
      <div className="px-md py-sm border-b border-tertiary bg-surface-variant flex items-center gap-sm">
        <button
          type="button"
          onClick={toggleView}
          className="font-label-md text-label-md text-secondary hover:text-primary px-sm py-xs rounded hover:bg-surface-container transition-colors"
        >
          {isSourceView ? 'WYSIWYG' : 'Markdown'}
        </button>

        {!isSourceView && (
          <>
            <div className="w-px h-4 bg-tertiary/30 mx-xs" />
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-xs rounded hover:bg-surface-container transition-colors ${
                editor.isActive('bold') ? 'text-primary bg-surface-container' : 'text-secondary hover:text-primary'
              }`}
              aria-label="Bold"
            >
              <span className="material-symbols-outlined text-[20px]">format_bold</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-xs rounded hover:bg-surface-container transition-colors ${
                editor.isActive('italic') ? 'text-primary bg-surface-container' : 'text-secondary hover:text-primary'
              }`}
              aria-label="Italic"
            >
              <span className="material-symbols-outlined text-[20px]">format_italic</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-xs rounded hover:bg-surface-container transition-colors ${
                editor.isActive('heading', { level: 2 }) ? 'text-primary bg-surface-container' : 'text-secondary hover:text-primary'
              }`}
              aria-label="Heading"
            >
              <span className="material-symbols-outlined text-[20px]">title</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-xs rounded hover:bg-surface-container transition-colors ${
                editor.isActive('bulletList') ? 'text-primary bg-surface-container' : 'text-secondary hover:text-primary'
              }`}
              aria-label="Bullet List"
            >
              <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-xs rounded hover:bg-surface-container transition-colors ${
                editor.isActive('blockquote') ? 'text-primary bg-surface-container' : 'text-secondary hover:text-primary'
              }`}
              aria-label="Blockquote"
            >
              <span className="material-symbols-outlined text-[20px]">format_quote</span>
            </button>
          </>
        )}
      </div>

      {/* Editor Content */}
      <div className={`flex-1 p-md ${minHeightClass}`}>
        {isSourceView ? (
          <textarea
            value={markdownContent}
            onChange={handleMarkdownChange}
            className={`w-full h-full ${minHeightClass} border-0 resize-none font-mono font-body-md text-body-md text-on-surface bg-transparent focus:ring-0 focus:outline-none leading-relaxed`}
          />
        ) : (
          <EditorContent
            editor={editor}
            className={`prose prose-sm max-w-none ${minHeightClass} font-body-lg text-on-surface [&_.ProseMirror]:outline-none [&_.ProseMirror]:${minHeightClass}`}
          />
        )}
      </div>
    </div>
  );
};
