import React from 'react';
import { X, History } from 'lucide-react';

export function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  maxPosition
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-widest text-white">Create Task Column</span>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">Task Name</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Mechanical Rig..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">Fluid Color</label>
            <div className="flex items-center gap-3 bg-[#141414] p-2 rounded-lg border border-white/10">
              <input
                type="color"
                value={form.hex}
                onChange={(e) => setForm({ ...form, hex: e.target.value })}
                className="w-9 h-9 rounded-full cursor-pointer bg-transparent border-none outline-none"
              />
              <span className="text-xs font-mono uppercase text-white font-bold">{form.hex}</span>
            </div>
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
              Position Slot (1 to {maxPosition})
            </label>
            <input
              type="number"
              min={1}
              max={maxPosition}
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
            />
          </div>

          <div className="flex gap-2.5 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-neutral-400 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 text-[10px] font-black uppercase tracking-wider cursor-pointer"
            >
              Spawn Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function HabitModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  maxPosition
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-widest text-white">Create Habit Track</span>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
              Habit Label (Max 5 letters)
            </label>
            <input
              type="text"
              maxLength={5}
              required
              autoFocus
              placeholder="e.g. READ"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value.toUpperCase() })}
              className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs text-white uppercase outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">Track Color</label>
            <div className="flex items-center gap-3 bg-[#141414] p-2 rounded-lg border border-white/10">
              <input
                type="color"
                value={form.hex}
                onChange={(e) => setForm({ ...form, hex: e.target.value })}
                className="w-9 h-9 rounded-full cursor-pointer bg-transparent border-none outline-none"
              />
              <span className="text-xs font-mono uppercase text-white font-bold">{form.hex}</span>
            </div>
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
              Position Slot (1 to {maxPosition})
            </label>
            <input
              type="number"
              min={1}
              max={maxPosition}
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
            />
          </div>

          <div className="flex gap-2.5 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-neutral-400 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 text-[10px] font-black uppercase tracking-wider cursor-pointer"
            >
              Spawn Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NameHistoryModal({ task, onClose }) {
  if (!task) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <History size={14} className="text-amber-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-white">
              {task.title} — History
            </span>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto">
          {task.nameHistory?.map((entry, i) => (
            <div key={i} className="flex justify-between items-center bg-[#141414] p-2.5 rounded-lg border border-white/5">
              <span className="text-xs font-bold text-white uppercase">{entry.title}</span>
              <span className="text-[9px] font-mono text-neutral-500">{entry.at}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-white text-black font-black uppercase text-[10px] tracking-wider rounded-lg hover:bg-neutral-200 cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}