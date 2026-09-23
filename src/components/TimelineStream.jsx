import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Check, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  ROW_HEIGHT, 
  TRACK_WIDTH, 
  COLUMN_WIDTH, 
  CANVAS_PAD_Y, 
  getColLeft, 
  parseHabitBlocks, 
  parseTaskMatrix 
} from '../trackerStore';

export function TimelineStream({
  scrollRef,
  timelineDays,
  todayIso,
  tasks,
  habits,
  selectedTaskId,
  onSelectTask,
  onMoveTask,
  onHabitClick,
  onDeleteHabit,
  onOpenHabitModal,
  onColorChange,
  editingItemId,
  editValue,
  setEditValue,
  onStartRename,
  onSaveRename,
  onRenameHabit,
  onOpenHistory
}) {
  const totalStreamHeight = CANVAS_PAD_Y + timelineDays.length * ROW_HEIGHT + 120;
  const habitRailWidth = Math.max(160, habits.length * 38 + 48);

  const [activeHabitPopover, setActiveHabitPopover] = useState(null);
  const [habitInlineEdit, setHabitInlineEdit] = useState(false);
  const [habitInputValue, setHabitInputValue] = useState('');
  const popoverRef = useRef(null);

  // Synchronized horizontal scroll ref
  const headerScrollRef = useRef(null);

  const handleStreamScroll = (e) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setActiveHabitPopover(null);
        setHabitInlineEdit(false);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenPopover = (habit) => {
    setActiveHabitPopover(habit.id);
    setHabitInputValue(habit.label);
    setHabitInlineEdit(false);
  };

  const handleCommitHabitRename = (habitId) => {
    if (habitInputValue.trim()) {
      onRenameHabit(habitId, habitInputValue.trim());
    }
    setHabitInlineEdit(false);
  };

  const taskCanvasWidth = Math.max(1000, tasks.length * (COLUMN_WIDTH + 40) + 120);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* STICKY HEADER BAR */}
      <div className="h-14 border-b border-white/5 bg-[#0a0a0a] flex shrink-0 z-30">
        
        {/* Pinned Left: Habits */}
        <div 
          style={{ width: `${habitRailWidth}px` }} 
          className="border-r border-white/5 relative shrink-0 z-20 bg-[#0a0a0a]"
          ref={popoverRef}
        >
          {habits.map((h, idx) => {
            const firstLetter = (h.label || '?').charAt(0).toUpperCase();
            const isStaggered = idx % 2 === 1;
            const isPopoverOpen = activeHabitPopover === h.id;
            const completedCount = Object.values(h.data || {}).filter((v) => v === 1).length;
            const pastNames = (h.nameHistory || []).slice(-4, -1).reverse();
            const laneX = 20 + idx * 38;

            return (
              <div 
                key={`${h.id}-${idx}`} 
                style={{ left: `${laneX}px` }}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
              >
                <button
                  onClick={() => isPopoverOpen ? setActiveHabitPopover(null) : handleOpenPopover(h)}
                  style={{
                    transform: isStaggered ? 'translateY(8px)' : 'translateY(-8px)',
                    borderColor: `${h.hex}60`,
                    color: h.hex,
                  }}
                  className="w-6 h-6 rounded-full border bg-[#121212] hover:scale-110 flex items-center justify-center text-[10px] font-black tracking-wider transition-transform cursor-pointer shadow-sm"
                  title={`Click to view ${h.label}`}
                >
                  {firstLetter}
                </button>

                {isPopoverOpen && (
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-48 bg-[#141414] border border-white/20 rounded-xl p-3 shadow-2xl flex flex-col gap-2.5 pointer-events-auto">
                    <div className="flex items-center justify-between">
                      {habitInlineEdit ? (
                        <div className="flex items-center gap-1 w-full mr-2">
                          <input
                            type="text"
                            maxLength={16}
                            autoFocus
                            value={habitInputValue}
                            onChange={(e) => setHabitInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCommitHabitRename(h.id)}
                            className="w-full bg-black border border-white/30 rounded px-1.5 py-0.5 text-xs text-white uppercase outline-none"
                          />
                          <button
                            onClick={() => handleCommitHabitRename(h.id)}
                            className="p-1 hover:bg-white/10 rounded text-emerald-400 cursor-pointer"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: h.hex }} />
                          <span className="text-xs font-black text-white uppercase">{h.label}</span>
                          <button
                            onClick={() => setHabitInlineEdit(true)}
                            className="text-neutral-500 hover:text-white transition-colors p-0.5 cursor-pointer"
                            title="Rename"
                          >
                            <Edit2 size={10} />
                          </button>
                        </div>
                      )}

                      <button 
                        onClick={(e) => {
                          onDeleteHabit(e, h.id);
                          setActiveHabitPopover(null);
                        }} 
                        className="text-red-400 hover:text-red-300 transition-colors p-1 cursor-pointer"
                        title="Delete habit"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="text-[10px] text-neutral-400 font-mono">
                      Logged Days: <span className="text-white font-bold">{completedCount}</span>
                    </div>

                    {pastNames.length > 0 && (
                      <div className="pt-2 border-t border-white/5 flex flex-col gap-1">
                        <span className="text-[8px] uppercase tracking-wider font-bold text-neutral-500">
                          Past Names:
                        </span>
                        {pastNames.map((item, nIdx) => (
                          <div key={nIdx} className="text-[9px] text-neutral-400 flex justify-between">
                            <span className="font-semibold text-neutral-300">• {item.title}</span>
                            <span className="text-neutral-600 font-mono">{item.at}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={onOpenHabitModal}
            title="Add Habit Lane"
            style={{ left: `${20 + habits.length * 38 + 6}px` }}
            className="absolute top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-full text-neutral-500 hover:text-white transition-colors cursor-pointer border border-dashed border-white/10 hover:border-white/30"
          >
            <Plus size={11} />
          </button>
        </div>

        {/* Pinned Left: Date Spacer */}
        <div className="w-28 border-r border-white/5 flex items-center justify-center shrink-0 z-20 bg-[#0a0a0a]">
          <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">DATE</span>
        </div>

        {/* Horizontally Synced Task Column Headers */}
        <div ref={headerScrollRef} className="flex-1 overflow-hidden relative no-scrollbar">
          <div style={{ width: `${taskCanvasWidth}px`, height: '100%' }} className="relative">
            {tasks.map((task, idx) => (
              <div
                key={`${task.id}-${idx}`}
                style={{ left: `${getColLeft(idx)}px`, width: `${COLUMN_WIDTH}px` }}
                className={`absolute h-full flex flex-col items-center justify-center transition-colors ${
                  selectedTaskId === task.id ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-1 justify-center w-full px-1">
                  {/* Move Left */}
                  <button
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveTask(task.id, 'left');
                    }}
                    className={`p-0.5 rounded hover:bg-white/10 transition-colors ${
                      idx === 0 ? 'opacity-20 cursor-default' : 'text-neutral-500 hover:text-white cursor-pointer'
                    }`}
                    title="Move column left"
                  >
                    <ChevronLeft size={12} />
                  </button>

                  {/* Color Picker */}
                  <input
                    type="color"
                    value={task.hex}
                    onChange={(e) => onColorChange(task.id, e.target.value)}
                    className="w-3 h-3 rounded-full cursor-pointer bg-transparent border-none outline-none shrink-0"
                    title="Click to tweak track color"
                  />

                  {/* Inline Title / Rename */}
                  {editingItemId === task.id ? (
                    <input
                      type="text"
                      maxLength={16}
                      value={editValue}
                      autoFocus
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => onSaveRename('task', task.id)}
                      onKeyDown={(e) => e.key === 'Enter' && onSaveRename('task', task.id)}
                      className="w-20 bg-black border border-white/30 rounded px-1 text-[10px] text-center text-white outline-none"
                    />
                  ) : (
                    <span 
                      onDoubleClick={() => onStartRename(task.id, task.title)} 
                      title="Double click to rename"
                      className="text-[10px] font-black uppercase tracking-wider truncate max-w-[80px] cursor-pointer"
                    >
                      {task.title}
                    </span>
                  )}

                  {/* History Clock */}
                  <button
                    onClick={() => onOpenHistory(task)}
                    className="text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer shrink-0"
                    title="View name evolution history"
                  >
                    <History size={10} />
                  </button>

                  {/* Move Right */}
                  <button
                    disabled={idx === tasks.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveTask(task.id, 'right');
                    }}
                    className={`p-0.5 rounded hover:bg-white/10 transition-colors ${
                      idx === tasks.length - 1 ? 'opacity-20 cursor-default' : 'text-neutral-500 hover:text-white cursor-pointer'
                    }`}
                    title="Move column right"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>

                <div className="h-4 flex items-center justify-center">
                  {task.streak > 0 ? (
                    <span className="text-[10px] text-amber-500 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                      🔥 {task.streak}
                    </span>
                  ) : (
                    <span className="text-[9px] text-neutral-600 tracking-wider font-mono">
                      {Object.values(task.matrix || {}).filter((v) => v > 0).length}d
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UNIFIED SCROLL STREAM */}
      <div 
        ref={scrollRef}
        onScroll={handleStreamScroll}
        className="flex-1 overflow-y-auto overflow-x-auto flex relative bg-[#050505] no-scrollbar select-none"
      >
        {/* Sticky Pinned Left: Habit Rails */}
        <div 
          style={{ width: `${habitRailWidth}px`, height: `${totalStreamHeight}px` }} 
          className="border-r border-white/5 bg-[#080808]/95 shrink-0 z-20 sticky left-0 shadow-lg"
        >
          {habits.map((habit, hIdx) => {
            const blocks = parseHabitBlocks(habit.data || {}, timelineDays);
            const laneX = 20 + hIdx * 38;

            return (
              <div key={`${habit.id}-${hIdx}`} className="absolute inset-y-0" style={{ left: `${laneX - 8}px`, width: '16px' }}>
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/5 rounded-full" />

                {blocks.map((b, bIdx) => {
                  const top = CANVAS_PAD_Y + b.start * ROW_HEIGHT + 14;
                  const height = b.days * ROW_HEIGHT - 28;
                  return (
                    <div
                      key={bIdx}
                      style={{ 
                        top: `${top}px`, 
                        height: `${height}px`, 
                        backgroundColor: habit.hex,
                        boxShadow: `0 0 8px ${habit.hex}60`
                      }}
                      className="absolute left-1/2 -translate-x-1/2 w-[5px] rounded-full transition-all duration-200 pointer-events-none"
                    />
                  );
                })}

                {timelineDays.map((d) => {
                  const isToday = d.isoDate === todayIso;
                  const isTicked = habit.data?.[d.isoDate] === 1;

                  return (
                    <div
                      key={d.isoDate}
                      style={{ top: `${CANVAS_PAD_Y + d.dayIndex * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                      onClick={() => onHabitClick(habit.id, d.isoDate)}
                      className={`absolute inset-x-0 flex items-center justify-center ${
                        isToday ? 'cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      {isToday && (
                        <div className={`w-3 h-3 rounded-full border border-dashed border-white/20 hover:border-white/50 transition-colors ${
                          isTicked ? 'opacity-0' : 'opacity-100'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sticky Pinned Left: Dates Column */}
        <div 
          style={{ width: '112px', height: `${totalStreamHeight}px`, left: `${habitRailWidth}px` }} 
          className="border-r border-white/5 bg-[#080808]/95 shrink-0 z-20 sticky shadow-[10px_0_20px_rgba(0,0,0,0.5)]"
        >
          {timelineDays.map((d) => {
            const isToday = d.isoDate === todayIso;

            return (
              <div 
                key={d.isoDate} 
                style={{ top: `${CANVAS_PAD_Y + d.dayIndex * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }} 
                className="absolute w-full flex items-center px-3"
              >
                <div
                  className={`w-full py-2 px-2 rounded flex flex-col items-center justify-center border transition-all ${
                    isToday 
                      ? 'border-white/30 bg-white/10 shadow-sm' 
                      : d.isSunday 
                        ? 'border-amber-400/30 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.08)]' 
                        : 'border-transparent'
                  }`}
                >
                  <span className={`text-[10px] font-black ${
                    isToday 
                      ? 'text-white' 
                      : d.isSunday 
                        ? 'text-amber-400' 
                        : 'text-neutral-500'
                  }`}>
                    {d.dayName}
                  </span>
                  <span className={`text-[9px] font-mono ${isToday ? 'text-white font-bold' : d.isSunday ? 'text-amber-300/80 font-bold' : 'text-neutral-600'}`}>
                    {d.dateStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fluid Tasks Scrollable Canvas */}
        <div className="relative shrink-0" style={{ width: `${taskCanvasWidth}px`, height: `${totalStreamHeight}px` }}>
          <div className="absolute inset-0 pointer-events-none z-0">
            {timelineDays.map((d) => {
              const isToday = d.isoDate === todayIso;

              return (
                <div 
                  key={d.isoDate} 
                  style={{ top: `${CANVAS_PAD_Y + d.dayIndex * ROW_HEIGHT}px` }} 
                  className="absolute w-full flex items-center"
                >
                  <div 
                    className={`w-full border-b ${
                      isToday 
                        ? 'border-white/25 shadow-[0_0_8px_rgba(255,255,255,0.15)]' 
                        : d.isSunday 
                          ? 'border-amber-400/20 bg-amber-400/[0.01]' 
                          : d.dayIndex % 7 === 0 
                            ? 'border-white/15' 
                            : 'border-white/5'
                    }`} 
                  />
                </div>
              );
            })}
          </div>

          <div className="absolute inset-0 z-10">
            {tasks.map((task, idx) => {
              const isSelected = selectedTaskId === task.id;
              const { blocks, cords } = parseTaskMatrix(task, timelineDays);

              return (
                <div
                  key={`${task.id}-${idx}`}
                  style={{ left: `${getColLeft(idx)}px`, width: `${COLUMN_WIDTH}px` }}
                  className={`absolute h-full flex justify-center cursor-pointer transition-colors ${
                    isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                  }`}
                  onClick={() => onSelectTask(task.id)}
                >
                  <div className="absolute inset-y-0 w-[1px] bg-white/5 pointer-events-none" />

                  {/* Umbilical Cords */}
                  {cords.map((cord, cIdx) => {
                    const top = CANVAS_PAD_Y + cord.startY * ROW_HEIGHT;
                    const height = (cord.endY - cord.startY) * ROW_HEIGHT;
                    return (
                      <div
                        key={cIdx}
                        style={{ 
                          top: `${top}px`, 
                          height: `${height}px`, 
                          backgroundColor: task.hex,
                          boxShadow: `0 0 12px ${task.hex}80`
                        }}
                        className="absolute w-[3px] opacity-70 pointer-events-none"
                      />
                    );
                  })}

                  {/* Fluid Block Trackers with Neon Luminescence */}
                  <div className="relative flex justify-center" style={{ width: `${TRACK_WIDTH}px` }}>
                    {blocks.map((block, bIdx) => {
                      const top = CANVAS_PAD_Y + block.start * ROW_HEIGHT;
                      const height = block.days * ROW_HEIGHT;
                      const isGlowing = task.streak > 3 || block.isActive;

                      return (
                        <div
                          key={bIdx}
                          style={{ 
                            top: `${top}px`, 
                            height: `${height}px`, 
                            width: `${TRACK_WIDTH}px`,
                            backgroundColor: task.hex,
                            boxShadow: isGlowing 
                              ? `0 0 9px ${task.hex}55, 0 4px 24px rgba(0,0,0,0.6)` 
                              : '0 4px 24px rgba(0,0,0,0.5)'
                          }}
                          className={`absolute rounded-full flex flex-col items-center justify-center py-3 pointer-events-none transition-all duration-200 ${
                            block.isActive ? 'ring-2 ring-white/60' : ''
                          }`}
                        >
                          <span className="text-[10px] font-black text-black/80 rotate-90">{block.days}d</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}