import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Bold, Italic, Underline, Strikethrough, Link2, Unlink } from 'lucide-react';

// A zero-dependency inline rich text field — contentEditable + a small floating
// toolbar that appears above whatever text is selected, using the still-widely-
// supported execCommand API. This is deliberately simple (bold/italic/underline/
// strikethrough/link) rather than a full editor framework: it's the minimum
// needed for "select some words and format them" directly on the page, which is
// what the Sites builder's inline editing needs.
export default function RichTextEditor({
  value, onChange, onBlurCommit, editable, placeholder, className, tag = 'div',
}: {
  value: string;
  onChange: (html: string) => void;
  onBlurCommit?: (html: string) => void;
  editable: boolean;
  placeholder?: string;
  className?: string;
  tag?: 'div' | 'span';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const isFocused = useRef(false);

  // Only push external value changes into the DOM when this field isn't the
  // one being actively typed in — otherwise the cursor jumps to the start on
  // every keystroke, which is the classic contentEditable footgun.
  useEffect(() => {
    if (ref.current && !isFocused.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const updateToolbarPosition = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !ref.current || !sel.rangeCount) {
      setToolbarPos(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!ref.current.contains(range.commonAncestorContainer)) {
      setToolbarPos(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const parentRect = ref.current.getBoundingClientRect();
    setToolbarPos({ top: rect.top - parentRect.top - 40, left: Math.max(0, rect.left - parentRect.left) });
  }, []);

  useEffect(() => {
    if (!editable) return;
    document.addEventListener('selectionchange', updateToolbarPosition);
    return () => document.removeEventListener('selectionchange', updateToolbarPosition);
  }, [editable, updateToolbarPosition]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML || '');
  };

  const handleLink = () => {
    const url = prompt('Link URL:');
    if (url) exec('createLink', url);
  };

  if (!editable) {
    const Tag = tag;
    return <Tag className={className} dangerouslySetInnerHTML={{ __html: value || '' }} />;
  }

  return (
    <div className="relative">
      {toolbarPos && (
        <div
          className="absolute z-40 flex items-center gap-0.5 bg-[#1a1c24] border border-white/15 rounded-lg shadow-xl px-1 py-1"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
          onMouseDown={(e) => e.preventDefault()} // keep the text selection alive when clicking a toolbar button
        >
          <button onClick={() => exec('bold')} className="p-1.5 rounded hover:bg-white/10 text-slate-200 cursor-pointer"><Bold className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('italic')} className="p-1.5 rounded hover:bg-white/10 text-slate-200 cursor-pointer"><Italic className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('underline')} className="p-1.5 rounded hover:bg-white/10 text-slate-200 cursor-pointer"><Underline className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('strikeThrough')} className="p-1.5 rounded hover:bg-white/10 text-slate-200 cursor-pointer"><Strikethrough className="w-3.5 h-3.5" /></button>
          <button onClick={handleLink} className="p-1.5 rounded hover:bg-white/10 text-slate-200 cursor-pointer"><Link2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => exec('unlink')} className="p-1.5 rounded hover:bg-white/10 text-slate-200 cursor-pointer"><Unlink className="w-3.5 h-3.5" /></button>
        </div>
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={`${className || ''} outline-none focus:ring-2 focus:ring-amber-400/50 rounded-sm empty:before:content-[attr(data-placeholder)] empty:before:opacity-40 empty:before:pointer-events-none cursor-text`}
        onFocus={() => { isFocused.current = true; }}
        onInput={() => onChange(ref.current?.innerHTML || '')}
        onBlur={() => {
          isFocused.current = false;
          setToolbarPos(null);
          onBlurCommit?.(ref.current?.innerHTML || '');
        }}
      />
    </div>
  );
}
