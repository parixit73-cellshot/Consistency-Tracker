import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, CheckCircle2, X, Trash2 } from 'lucide-react';

export function BlockNoteModal({
  isOpen,
  onClose,
  taskTitle,
  initialNote,
  onSave
}) {
  const [done, setDone] = useState('');
  const [next, setNext] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    if (initialNote) {
      setDone(initialNote.done || '');
      setNext(initialNote.next || '');
    } else {
      setDone('');
      setNext('');
    }
  }, [initialNote, isOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        if (isOpen) {
          onSave({ done, next });
          onClose();
        }
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, done, next, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="w-full max-w-sm bg-[#0e0e0e] border border-white/15 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-white block">
              {taskTitle}
            </span>
            <span className="text-[9px] text-neutral-400">Tracker Resume Context</span>
          </div>
          <button onClick={() => { onSave({ done, next }); onClose(); }} className="text-neutral-500 hover:text-white cursor-pointer">
            <X size={15} />
          </button>
        </div>

        {/* What was finished */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 size={11} />
            <span>Finished / Accomplished</span>
          </label>
          <textarea
            rows={2}
            autoFocus
            value={done}
            placeholder="e.g. Arms & torso rigged, skinning complete..."
            onChange={(e) => setDone(e.target.value)}
            className="w-full bg-[#141414] border border-white/10 rounded-lg p-2.5 text-xs text-neutral-200 outline-none focus:border-white/30 resize-none font-mono placeholder:text-neutral-600"
          />
        </div>

        {/* Where to pick back up */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <ArrowRight size={11} />
            <span>Next Step When Resuming</span>
          </label>
          <textarea
            rows={2}
            value={next}
            placeholder="e.g. Paint weights on fingers, test pose rotation..."
            onChange={(e) => setNext(e.target.value)}
            className="w-full bg-[#141414] border border-white/10 rounded-lg p-2.5 text-xs text-neutral-200 outline-none focus:border-white/30 resize-none font-mono placeholder:text-neutral-600"
          />
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-white/5">
          {(done || next) ? (
            <button
              onClick={() => {
                onSave({ done: '', next: '' });
                onClose();
              }}
              className="flex items-center gap-1 text-[9px] text-red-400 hover:text-red-300 font-bold uppercase cursor-pointer"
            >
              <Trash2 size={11} />
              <span>Clear Note</span>
            </button>
          ) : <div />}

          <button
            onClick={() => {
              onSave({ done, next });
              onClose();
            }}
            className="px-4 py-1.5 bg-white text-black font-black uppercase text-[10px] tracking-wider rounded-lg hover:bg-neutral-200 cursor-pointer"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
// Backward-compatibility export alias to keep Vite HMR happy
export const TaskNotesCallout = BlockNoteModal;