import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Placeholder from '@tiptap/extension-placeholder';

interface JournalEditorProps {
  initialContent?: string;
  onChange?: (markdown: string) => void;
  minHeightClass?: string;
  maxHeightClass?: string;
  placeholder?: string;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  initialContent = '',
  onChange,
  minHeightClass = 'min-h-[120px]',
  maxHeightClass = 'max-h-[200px]',
  placeholder = 'Record your personal reflections, quotes, or thoughts on this experience...',
}) => {
  const [isSourceView, setIsSourceView] = useState(false);
  const [markdownContent, setMarkdownContent] = useState(initialContent);
  const [, setTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
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
    <div className="border border-tertiary/25 rounded-lg overflow-hidden flex flex-col bg-surface-container-lowest focus-within:border-primary/60 transition-colors shadow-xs">
      {/* Minimalist Tactile Toolbar */}
      <div className="px-sm py-1 border-b border-tertiary/20 bg-surface-container-low flex items-center gap-xs flex-wrap">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleView}
          className="font-label-md text-[11px] text-secondary hover:text-primary px-2 py-0.5 rounded hover:bg-surface transition-colors cursor-pointer"
        >
          {isSourceView ? 'WYSIWYG' : 'Markdown'}
        </button>

        {!isSourceView && (
          <>
            <div className="w-px h-3 bg-tertiary/30 mx-0.5" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1 rounded transition-all cursor-pointer flex items-center justify-center ${
                editor.isActive('bold')
                  ? 'text-primary bg-surface font-semibold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
              aria-label="Bold"
              title="Bold (Ctrl+B)"
            >
              <span className="material-symbols-outlined text-[17px]">format_bold</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1 rounded transition-all cursor-pointer flex items-center justify-center ${
                editor.isActive('italic')
                  ? 'text-primary bg-surface font-semibold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
              aria-label="Italic"
              title="Italic (Ctrl+I)"
            >
              <span className="material-symbols-outlined text-[17px]">format_italic</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1 rounded transition-all cursor-pointer flex items-center justify-center ${
                editor.isActive('heading', { level: 2 })
                  ? 'text-primary bg-surface font-semibold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
              aria-label="Heading"
              title="Heading 2"
            >
              <span className="material-symbols-outlined text-[17px]">title</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1 rounded transition-all cursor-pointer flex items-center justify-center ${
                editor.isActive('bulletList')
                  ? 'text-primary bg-surface font-semibold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
              aria-label="Bullet List"
              title="Bullet List"
            >
              <span className="material-symbols-outlined text-[17px]">format_list_bulleted</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1 rounded transition-all cursor-pointer flex items-center justify-center ${
                editor.isActive('blockquote')
                  ? 'text-primary bg-surface font-semibold shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
              aria-label="Blockquote"
              title="Blockquote"
            >
              <span className="material-symbols-outlined text-[17px]">format_quote</span>
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
            placeholder={placeholder}
            className={`w-full ${minHeightClass} border-0 resize-none font-mono text-sm text-on-surface bg-transparent focus:ring-0 focus:outline-none leading-relaxed placeholder:text-secondary/40`}
          />
        ) : (
          <EditorContent
            editor={editor}
            className={`prose prose-sm max-w-none ${minHeightClass} text-on-surface [&_.ProseMirror]:outline-none [&_.ProseMirror]:${minHeightClass} [&_.ProseMirror_p]:my-0.5 leading-relaxed [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-secondary/40 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0`}
          />
        )}
      </div>
    </div>
  );
};
