import React from 'react';
import { 
  Plus, Play, Square, RotateCcw, FastForward, Rewind, LocateFixed, 
  Archive, Download, Upload, Palette, Layers, FileText 
} from 'lucide-react';

export function Header({
  currentDayInfo,
  onCenterWeek,
  onShiftDay,
  onExportBackup,
  onTriggerFileInput,
  onOpenRevisions,
  onOpenVault,
  archivedCount,
  onOpenTaskModal
}) {
  return (
    <header className="h-14 border-b border-white/10 bg-[#0a0a0a] flex items-center px-6 shrink-0 z-40 justify-between">
      <div className="flex items-center gap-6">
        <span className="text-[11px] font-black tracking-[0.2em] uppercase text-neutral-500">Sprint Board</span>
        <div className="h-4 w-[1px] bg-white/10" />
        <div className="text-[11px] text-neutral-300 font-bold tracking-widest uppercase">
          Week {currentDayInfo.weekNum} <span className="text-neutral-600 mx-2">/</span> 
          <span className={currentDayInfo.isSunday ? 'text-amber-400 font-black' : ''}>
            {currentDayInfo.dayName} {currentDayInfo.dateStr}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onCenterWeek}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider cursor-pointer"
          title="Recenter view to current week"
        >
          <LocateFixed size={13} />
          <span>Focus Week</span>
        </button>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
          <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider mr-1">Simulate:</span>
          <button 
            onClick={() => onShiftDay(-1)} 
            className="p-1 hover:bg-white/10 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <Rewind size={12} />
          </button>
          <span className={`text-[10px] font-bold px-1 ${currentDayInfo.isSunday ? 'text-amber-400' : 'text-white'}`}>
            {currentDayInfo.dateStr}
          </span>
          <button 
            onClick={() => onShiftDay(1)} 
            className="p-1 hover:bg-white/10 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <FastForward size={12} />
          </button>
        </div>

        <div className="flex items-center gap-1 border-l border-white/10 pl-3">
          <button
            onClick={onExportBackup}
            className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Export Full Backup (JSON)"
          >
            <Download size={14} />
          </button>
          <button
            onClick={onTriggerFileInput}
            className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Import Specific Tracks from JSON"
          >
            <Upload size={14} />
          </button>
          <button
            onClick={onOpenRevisions}
            className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Snapshots & Rollbacks"
          >
            <Layers size={14} />
          </button>
          <button
            onClick={onOpenVault}
            className="relative p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Open Vault (Archived Tasks)"
          >
            <Archive size={14} />
            {archivedCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>

        <button
          onClick={onOpenTaskModal}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors text-[10px] font-black tracking-widest uppercase cursor-pointer"
        >
          <Plus size={14} strokeWidth={3} />
          <span>New Task</span>
        </button>
      </div>
    </header>
  );
}

export function FooterControls({
  selectedTask,
  todayStatus,
  onColorChange,
  onArchiveTask,
  onAction,
  onOpenNotes
}) {
  return (
    <footer className="h-16 border-t border-white/10 bg-[#0a0a0a] flex items-center justify-between px-8 shrink-0 z-40">
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Selected:</span>
        <span className="text-[12px] font-black uppercase tracking-widest text-white">
          {selectedTask ? selectedTask.title : 'None'}
        </span>
        {selectedTask && (
          <div className="flex items-center gap-3 ml-4">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
              <Palette size={11} className="text-neutral-400" />
              <input
                type="color"
                value={selectedTask.hex}
                onChange={(e) => onColorChange(selectedTask.id, e.target.value)}
                className="w-4 h-4 rounded-full cursor-pointer bg-transparent border-none outline-none"
                title="Modify track color"
              />
            </div>

            <button
              onClick={() => onArchiveTask(selectedTask.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
              title="Archive column into vault (Delete key)"
            >
              <Archive size={12} />
              <span>Archive</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Note Trigger Button */}
        <button
          disabled={!selectedTask}
          onClick={onOpenNotes}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-bold tracking-wider uppercase transition-colors border ${
            !selectedTask
              ? 'border-white/5 text-white/20 cursor-default'
              : 'border-white/20 hover:border-white/50 text-white bg-white/5 hover:bg-white/10 cursor-pointer'
          }`}
          title="Open block notes (Hotkey: N)"
        >
          <FileText size={12} className={selectedTask ? 'text-amber-400' : ''} />
          <span>Note <span className="opacity-50 text-[9px]">(N)</span></span>
        </button>

        <button
          disabled={!selectedTask || todayStatus === 2}
          onClick={() => onAction('START')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors ${
            !selectedTask || todayStatus === 2
              ? 'bg-white/5 text-white/20 cursor-default'
              : 'bg-white text-black hover:bg-neutral-200 cursor-pointer'
          }`}
        >
          <Play size={14} fill={!selectedTask || todayStatus === 2 ? 'currentColor' : 'black'} />
          <span>Start Today</span>
        </button>

        <button
          disabled={!selectedTask || todayStatus !== 2}
          onClick={() => onAction('STOP')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors border ${
            !selectedTask || todayStatus !== 2
              ? 'border-white/5 text-white/20 cursor-default'
              : 'border-white text-white hover:bg-white/10 cursor-pointer'
          }`}
        >
          <Square size={14} fill={!selectedTask || todayStatus !== 2 ? 'currentColor' : 'white'} />
          <span>Mark Ended</span>
        </button>

        <button
          disabled={!selectedTask || todayStatus === 0}
          onClick={() => onAction('UNDO')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors border ${
            !selectedTask || todayStatus === 0
              ? 'border-white/5 text-white/20 cursor-default'
              : 'border-red-500/40 text-red-400 hover:bg-red-500/10 cursor-pointer'
          }`}
        >
          <RotateCcw size={14} />
          <span>Undo Today</span>
        </button>
      </div>
    </footer>
  );
}