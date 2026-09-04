import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

interface JournalEditorProps {
  initialContent?: string;
  onChange?: (markdown: string) => void;
  minHeightClass?: string;
  maxHeightClass?: string;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  initialContent = '',
  onChange,
  minHeightClass = 'min-h-[140px]',
  maxHeightClass = 'max-h-[240px]',
}) => {
  const [isSourceView, setIsSourceView] = useState(false);
  const [markdownContent, setMarkdownContent] = useState(initialContent);
  const [, setTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
    ],
    content: initialContent,
    onTransaction: () => {
      // Force re-render on selection, cursor, and mark changes so toolbar reflects active state immediately
      setTick((t) => t + 1);
    },
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
    <div className="border border-tertiary rounded-lg overflow-hidden flex flex-col bg-surface-container-lowest focus-within:border-primary transition-colors">
      {/* Toolbar */}
      <div className="px-sm py-xs border-b border-tertiary/30 bg-surface-variant flex items-center gap-xs flex-wrap">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleView}
          className="font-label-md text-xs text-secondary hover:text-primary px-sm py-1 rounded hover:bg-surface-container transition-colors cursor-pointer"
        >
          {isSourceView ? 'WYSIWYG' : 'Markdown'}
        </button>

        {!isSourceView && (
          <>
            <div className="w-px h-3.5 bg-tertiary/40 mx-xs" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1 rounded transition-all cursor-pointer flex items-center justify-center ${
                editor.isActive('bold')
                  ? 'text-primary bg-surface font-semibold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface-container'
              }`}
              aria-label="Bold"
              title="Bold (Ctrl+B)"
            >
              <span className="material-symbols-outlined text-[18px]">format_bold</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1 rounded transition-all cursor-pointer flex items-center justify-center ${
                editor.isActive('italic')
                  ? 'text-primary bg-surface font-semibold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface-container'
              }`}
              aria-label="Italic"
              title="Italic (Ctrl+I)"
            >
              <span className="material-symbols-outlined text-[18px]">format_italic</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1 rounded transition-all cursor-pointer flex items-center justify-center ${
                editor.isActive('heading', { level: 2 })
                  ? 'text-primary bg-surface font-semibold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface-container'
              }`}
              aria-label="Heading"
              title="Heading 2"
            >
              <span className="material-symbols-outlined text-[18px]">title</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1 rounded transition-all cursor-pointer flex items-center justify-center ${
                editor.isActive('bulletList')
                  ? 'text-primary bg-surface font-semibold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface-container'
              }`}
              aria-label="Bullet List"
              title="Bullet List"
            >
              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1 rounded transition-all cursor-pointer flex items-center justify-center ${
                editor.isActive('blockquote')
                  ? 'text-primary bg-surface font-semibold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface-container'
              }`}
              aria-label="Blockquote"
              title="Blockquote"
            >
              <span className="material-symbols-outlined text-[18px]">format_quote</span>
            </button>
          </>
        )}
      </div>

      {/* Editor Content */}
      <div className={`p-sm sm:p-md ${minHeightClass} ${maxHeightClass} overflow-y-auto`}>
        {isSourceView ? (
          <textarea
            value={markdownContent}
            onChange={handleMarkdownChange}
            placeholder="Write your personal thoughts, reflections, or favorite moments..."
            className={`w-full ${minHeightClass} border-0 resize-none font-mono text-sm text-on-surface bg-transparent focus:ring-0 focus:outline-none leading-relaxed placeholder:text-secondary/50`}
          />
        ) : (
          <EditorContent
            editor={editor}
            className={`prose prose-sm max-w-none ${minHeightClass} text-on-surface [&_.ProseMirror]:outline-none [&_.ProseMirror]:${minHeightClass} [&_.ProseMirror_p]:my-1 leading-relaxed`}
          />
        )}
      </div>
    </div>
  );
};
