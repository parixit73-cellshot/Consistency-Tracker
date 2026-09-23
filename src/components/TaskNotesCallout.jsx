import React, { useState, useRef, useEffect } from 'react';
import { FileText, Bold, Italic, List, X, Type } from 'lucide-react';

export function TaskNotesCallout({
  task,
  topPos,
  onSaveNotes
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState(task.notes || '');
  const [fontSize, setFontSize] = useState(task.notesFontSize || 'text-xs');
  const panelRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    setContent(task.notes || '');
    setFontSize(task.notesFontSize || 'text-xs');
  }, [task.notes, task.notesFontSize]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        if (isOpen) {
          onSaveNotes(task.id, content, fontSize);
          setIsOpen(false);
        }
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, content, fontSize, onSaveNotes, task.id]);

  const insertFormatting = (prefix, suffix = '') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = `${prefix}${selected}${suffix}`;
    const nextContent = text.substring(0, start) + replacement + text.substring(end);
    setContent(nextContent);
    onSaveNotes(task.id, nextContent, fontSize);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  const handleInsertBullet = () => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const text = el.value;
    const nextContent = text.substring(0, start) + '\n• ' + text.substring(start);
    setContent(nextContent);
    onSaveNotes(task.id, nextContent, fontSize);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + 3, start + 3);
    }, 10);
  };

  const cycleFontSize = () => {
    const sizes = ['text-[10px]', 'text-xs', 'text-sm'];
    const nextIndex = (sizes.indexOf(fontSize) + 1) % sizes.length;
    const nextSize = sizes[nextIndex];
    setFontSize(nextSize);
    onSaveNotes(task.id, content, nextSize);
  };

  return (
    <div 
      ref={panelRef}
      style={{ top: `${topPos}px` }} 
      className="absolute -right-3 z-30 flex items-start pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Pull Tab Indicator: Snug on the right edge of the track pill */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-3.5 h-7 rounded-r-md border border-l-0 border-white/20 bg-[#121212] flex items-center justify-center hover:w-4 hover:bg-[#1a1a1a] transition-all cursor-pointer shadow-md ${
          task.notes?.trim() ? 'text-amber-400' : 'text-neutral-500 hover:text-white'
        }`}
        title="Open Task Callout Note"
      >
        <FileText size={9} />
      </button>

      {/* Floating Note Callout Box */}
      {isOpen && (
        <div 
          className="absolute left-5 top-0 w-64 bg-[#111111] border border-white/20 rounded-xl shadow-2xl p-3 flex flex-col gap-2.5 backdrop-blur-md z-50"
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-[10px] font-black uppercase tracking-wider text-white truncate max-w-[120px]">
              {task.title} Notes
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Bold"
              >
                <Bold size={11} />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*')}
                className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Italic"
              >
                <Italic size={11} />
              </button>
              <button
                type="button"
                onClick={handleInsertBullet}
                className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Bullet point"
              >
                <List size={11} />
              </button>
              <button
                type="button"
                onClick={cycleFontSize}
                className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Cycle font size"
              >
                <Type size={11} />
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveNotes(task.id, content, fontSize);
                  setIsOpen(false);
                }}
                className="p-1 hover:bg-white/10 rounded text-neutral-500 hover:text-white transition-colors cursor-pointer ml-1"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            rows={5}
            value={content}
            placeholder="Log quick bullet notes, blockers, or ideas..."
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => onSaveNotes(task.id, content, fontSize)}
            className={`w-full bg-[#080808] border border-white/10 rounded-lg p-2 text-white font-mono placeholder:text-neutral-600 outline-none focus:border-white/30 resize-none leading-relaxed ${fontSize}`}
          />

          <div className="flex justify-between items-center text-[9px] text-neutral-500">
            <span>Auto-saved</span>
            <span className="font-mono">{content.length} chars</span>
          </div>
        </div>
      )}
    </div>
  );
}