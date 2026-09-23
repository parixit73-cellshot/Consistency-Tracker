import React from 'react';
import { Plus, X, History } from 'lucide-react';
import { 
  ROW_HEIGHT, 
  TRACK_WIDTH, 
  COLUMN_WIDTH, 
  CANVAS_PAD_Y, 
  TIMELINE_DAYS, 
  getColLeft, 
  parseHabitBlocks, 
  parseTaskMatrix 
} from '../trackerStore';

export function TimelineStream({
  scrollRef,
  tasks,
  habits,
  currentDay,
  selectedTaskId,
  onSelectTask,
  onHabitClick,
  onDeleteHabit,
  onOpenHabitModal,
  onColorChange,
  editingItemId,
  editValue,
  setEditValue,
  onStartRename,
  onSaveRename,
  onOpenHistory
}) {
  const totalStreamHeight = CANVAS_PAD_Y + TIMELINE_DAYS.length * ROW_HEIGHT + 120;
  const habitRailWidth = Math.max(140, habits.length * 36 + 28);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* STICKY COLUMN TITLES BAR */}
      <div className="h-10 border-b border-white/5 bg-[#0a0a0a] flex shrink-0 z-30">
        <div 
          style={{ width: `${habitRailWidth}px` }} 
          className="border-r border-white/5 flex items-center justify-around px-2 shrink-0 relative"
        >
          {habits.map((h) => (
            <div 
              key={h.id} 
              className="relative group/h flex items-center justify-center cursor-pointer"
              onDoubleClick={() => onStartRename(h.id, h.label)}
              title="Double click to rename"
            >
              {editingItemId === h.id ? (
                <input
                  type="text"
                  maxLength={5}
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => onSaveRename('habit', h.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onSaveRename('habit', h.id)}
                  className="w-12 bg-black border border-white/30 rounded px-1 text-[9px] text-center text-white outline-none"
                />
              ) : (
                <span className="text-[8px] tracking-wider text-neutral-500 group-hover/h:text-white font-black uppercase rotate-[-45deg] origin-bottom-left -translate-y-2 translate-x-2 transition-colors">
                  {h.label}
                </span>
              )}
              <button
                onClick={(e) => onDeleteHabit(e, h.id)}
                title={`Delete ${h.label}`}
                className="absolute -top-1 -right-2 hidden group-hover/h:flex items-center justify-center w-3 h-3 bg-red-500/80 hover:bg-red-500 text-white rounded-full cursor-pointer z-40"
              >
                <X size={8} />
              </button>
            </div>
          ))}
          <button
            onClick={onOpenHabitModal}
            title="Add Habit Lane"
            className="ml-1 p-1 hover:bg-white/10 rounded text-neutral-500 hover:text-white transition-colors cursor-pointer"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="w-28 border-r border-white/5 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">DATE</span>
        </div>

        <div className="flex-1 relative overflow-hidden min-w-max">
          {tasks.map((task, idx) => (
            <div
              key={task.id}
              style={{ left: `${getColLeft(idx)}px`, width: `${COLUMN_WIDTH}px` }}
              className={`absolute h-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                selectedTaskId === task.id ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <input
                type="color"
                value={task.hex}
                onChange={(e) => onColorChange(task.id, e.target.value)}
                className="w-3 h-3 rounded-full cursor-pointer bg-transparent border-none outline-none mr-0.5"
                title="Click to tweak track color"
              />

              {editingItemId === task.id ? (
                <input
                  type="text"
                  maxLength={16}
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => onSaveRename('task', task.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onSaveRename('task', task.id)}
                  className="w-24 bg-black border border-white/30 rounded px-1 text-[10px] text-center text-white outline-none"
                />
              ) : (
                <span onDoubleClick={() => onStartRename(task.id, task.title)} title="Double click to rename">
                  {task.title}
                </span>
              )}

              <button
                onClick={() => onOpenHistory(task)}
                className="text-neutral-600 hover:text-neutral-300 transition-colors cursor-pointer"
                title="View name evolution history"
              >
                <History size={11} />
              </button>

              {task.streak > 0 && (
                <span className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                  🔥{task.streak}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* UNIFIED VERTICAL SCROLL STREAM */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden flex relative bg-[#050505] no-scrollbar"
      >
        {/* Habit Rails */}
        <div 
          style={{ width: `${habitRailWidth}px`, height: `${totalStreamHeight}px` }} 
          className="border-r border-white/5 bg-[#080808]/90 shrink-0 z-10 relative"
        >
          {habits.map((habit, hIdx) => {
            const blocks = parseHabitBlocks(habit.data);
            const laneX = (habitRailWidth / (habits.length + 1)) * (hIdx + 1);

            return (
              <div key={habit.id} className="absolute inset-y-0" style={{ left: `${laneX - 8}px`, width: '16px' }}>
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

                {TIMELINE_DAYS.map((d) => (
                  <div
                    key={d.dayIndex}
                    style={{ top: `${CANVAS_PAD_Y + d.dayIndex * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                    onClick={() => onHabitClick(habit.id, d.dayIndex)}
                    className={`absolute inset-x-0 flex items-center justify-center ${
                      d.dayIndex === currentDay ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {d.dayIndex === currentDay && (
                      <div className={`w-3 h-3 rounded-full border border-dashed border-white/20 hover:border-white/50 transition-colors ${
                        habit.data[d.dayIndex] ? 'opacity-0' : 'opacity-100'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Dates Column */}
        <div className="w-28 border-r border-white/5 bg-[#080808]/90 shrink-0 z-10 relative shadow-[10px_0_20px_rgba(0,0,0,0.4)]" style={{ height: `${totalStreamHeight}px` }}>
          {TIMELINE_DAYS.map((d) => (
            <div 
              key={d.dayIndex} 
              style={{ top: `${CANVAS_PAD_Y + d.dayIndex * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }} 
              className="absolute w-full flex items-center px-3"
            >
              <div
                className={`w-full py-2 px-2 rounded flex flex-col items-center justify-center border transition-all ${
                  d.dayIndex === currentDay 
                    ? 'border-white/20 bg-white/10 shadow-sm' 
                    : d.isSunday 
                      ? 'border-amber-400/30 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.08)]' 
                      : 'border-transparent'
                }`}
              >
                <span className={`text-[10px] font-black ${
                  d.dayIndex === currentDay 
                    ? 'text-white' 
                    : d.isSunday 
                      ? 'text-amber-400' 
                      : 'text-neutral-500'
                }`}>
                  {d.dayName}
                </span>
                <span className={`text-[9px] font-mono ${d.isSunday ? 'text-amber-300/80 font-bold' : 'text-neutral-600'}`}>
                  {d.dateStr}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Continuous Canvas */}
        <div className="flex-1 relative min-w-max" style={{ height: `${totalStreamHeight}px` }}>
          {/* Static Wires */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {TIMELINE_DAYS.map((d) => (
              <div 
                key={d.dayIndex} 
                style={{ top: `${CANVAS_PAD_Y + d.dayIndex * ROW_HEIGHT}px` }} 
                className="absolute w-full flex items-center"
              >
                <div 
                  className={`w-full border-b ${
                    d.dayIndex === currentDay 
                      ? 'border-white/25 shadow-[0_0_8px_rgba(255,255,255,0.15)]' 
                      : d.isSunday 
                        ? 'border-amber-400/20 bg-amber-400/[0.01]' 
                        : d.dayIndex % 7 === 0 
                          ? 'border-white/15' 
                          : 'border-white/5'
                  }`} 
                />
              </div>
            ))}
          </div>

          {/* Dynamic Fluid Layer */}
          <div className="absolute inset-0 z-20">
            {tasks.map((task, idx) => {
              const isSelected = selectedTaskId === task.id;
              const { blocks, cords } = parseTaskMatrix(task, currentDay);

              return (
                <div
                  key={task.id}
                  style={{ left: `${getColLeft(idx)}px`, width: `${COLUMN_WIDTH}px` }}
                  className={`absolute h-full flex justify-center cursor-pointer transition-colors ${
                    isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                  }`}
                  onClick={() => onSelectTask(task.id)}
                >
                  <div className="absolute inset-y-0 w-[1px] bg-white/5 pointer-events-none" />

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

                  {blocks.map((block, bIdx) => {
                    const top = CANVAS_PAD_Y + block.start * ROW_HEIGHT;
                    const height = block.days * ROW_HEIGHT;

                    return (
                      <div
                        key={bIdx}
                        style={{ 
                          top: `${top}px`, 
                          height: `${height}px`, 
                          width: `${TRACK_WIDTH}px`,
                          backgroundColor: task.hex
                        }}
                        className="absolute rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center pointer-events-none transition-all duration-200"
                      >
                        <span className="text-[10px] font-black text-black/70 rotate-90">{block.days}d</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}