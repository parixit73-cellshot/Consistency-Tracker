import React, { useState } from 'react';
import { Plus, ChevronUp, ChevronDown, Play, Square, RotateCcw } from 'lucide-react';
import {
  ROW_HEIGHT,
  TRACK_WIDTH,
  COLUMN_WIDTH,
  CANVAS_PAD_Y,
  CURRENT_DAY_INDEX,
  WEEK_DAYS,
  INITIAL_HABITS,
  INITIAL_TASKS,
  getColLeft,
  parseTaskMatrix,
  executeMatrixAction,
  toggleHabitToday,
  createNewTask,
} from './trackerStore';

function StaticGridWires() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {WEEK_DAYS.map((d) => (
        <div key={d.dayIndex} style={{ top: `${CANVAS_PAD_Y + d.dayIndex * ROW_HEIGHT}px` }} className="absolute w-full flex items-center">
          <div className={`w-full border-b ${d.isToday ? 'border-white/15 shadow-[0_0_8px_rgba(255,255,255,0.1)]' : 'border-white/5'}`} />
        </div>
      ))}
    </div>
  );
}

function DynamicFluidLayer({ tasks, selectedTaskId, onSelectTask }) {
  return (
    <div className="absolute inset-0 z-20">
      {tasks.map((task, idx) => {
        const isSelected = selectedTaskId === task.id;
        const { blocks, cords } = parseTaskMatrix(task);

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

            {/* Derived Umbilical Cords */}
            {cords.map((cord, cIdx) => {
              const top = CANVAS_PAD_Y + cord.startY * ROW_HEIGHT;
              const height = (cord.endY - cord.startY) * ROW_HEIGHT;
              return (
                <div
                  key={cIdx}
                  style={{ top: `${top}px`, height: `${height}px` }}
                  className={`absolute w-[3px] opacity-70 ${task.colorClass} shadow-[0_0_12px_${task.hex}60] pointer-events-none`}
                />
              );
            })}

            {/* Derived Contiguous Time Blocks */}
            {blocks.map((block, bIdx) => {
              const top = CANVAS_PAD_Y + block.start * ROW_HEIGHT;
              const height = block.days * ROW_HEIGHT;

              return (
                <div
                  key={bIdx}
                  style={{ top: `${top}px`, height: `${height}px`, width: `${TRACK_WIDTH}px` }}
                  className={`absolute rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center ${task.colorClass} pointer-events-none transition-all duration-200`}
                >
                  <span className="text-[10px] font-black text-black/60 rotate-90">{block.days}d</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [habits, setHabits] = useState(INITIAL_HABITS);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const handleNewTaskPrompt = () => {
    const title = window.prompt('Enter new task name:');
    if (title) setTasks((prev) => createNewTask(prev, title));
  };

  const handleHabitClick = (habitId, dayIndex) => {
    setHabits((prev) => toggleHabitToday(prev, habitId, dayIndex));
  };

  const handleAction = (action) => {
    if (!selectedTaskId) return;
    setTasks((prev) => executeMatrixAction(prev, selectedTaskId, action));
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const todayStatus = selectedTask ? selectedTask.matrix[CURRENT_DAY_INDEX] : 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070707] text-white font-mono select-none overflow-hidden">
      {/* HEADER */}
      <header className="h-14 border-b border-white/10 bg-[#0a0a0a] flex items-center px-6 shrink-0 z-30 justify-between">
        <div className="flex items-center gap-8">
          <span className="text-[11px] font-black tracking-[0.2em] uppercase text-neutral-500">Sprint Board</span>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="text-[11px] text-neutral-300 font-bold tracking-widest uppercase">
            Week 39 <span className="text-neutral-600 mx-2">/</span> Sep 2026
          </div>
        </div>
        <button
          onClick={handleNewTaskPrompt}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors text-[10px] font-black tracking-widest uppercase cursor-pointer"
        >
          <Plus size={14} strokeWidth={3} />
          <span>New Task</span>
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Habit Rails */}
        <aside className="w-32 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 z-20">
          <div className="h-10 border-b border-white/5 flex items-center justify-center px-2">
            <div className="flex w-full justify-around">
              {habits.map((h) => (
                <span
                  key={h.id}
                  className="text-[8px] tracking-wider text-neutral-500 font-black uppercase rotate-[-45deg] origin-bottom-left -translate-y-2 translate-x-2"
                >
                  {h.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col py-6">
            {WEEK_DAYS.map((d) => (
              <div key={d.dayIndex} style={{ height: `${ROW_HEIGHT}px` }} className="w-full flex items-center justify-around px-4">
                {habits.map((habit) => {
                  const isDone = habit.data[d.dayIndex];
                  const isToday = d.dayIndex === CURRENT_DAY_INDEX;
                  return (
                    <div
                      key={habit.id}
                      onClick={() => handleHabitClick(habit.id, d.dayIndex)}
                      className={`relative h-full flex items-center justify-center w-4 ${
                        isToday ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="absolute inset-y-1 w-[2px] bg-white/5 rounded-full" />
                      <div
                        className={`absolute w-[4px] rounded-full transition-all duration-300 ${
                          isDone ? `h-10 ${habit.color} shadow-[0_0_10px_${habit.hex}40]` : 'h-0'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="h-10 border-t border-white/5" />
        </aside>

        {/* Dates Column */}
        <aside className="w-28 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 z-30 shadow-[10px_0_20px_rgba(0,0,0,0.5)]">
          <button className="h-10 border-b border-white/5 hover:bg-white/5 text-neutral-500 flex items-center justify-center gap-2 transition-colors cursor-pointer">
            <ChevronUp size={12} strokeWidth={3} />
          </button>
          <div className="flex-1 flex flex-col py-6">
            {WEEK_DAYS.map((d) => (
              <div key={d.dayIndex} style={{ height: `${ROW_HEIGHT}px` }} className="flex items-center px-3">
                <div
                  className={`w-full py-2 px-2 rounded flex flex-col items-center justify-center border transition-all ${
                    d.isToday ? 'border-white/20 bg-white/10 shadow-sm' : 'border-transparent'
                  }`}
                >
                  <span className={`text-[10px] font-black ${d.isToday ? 'text-white' : 'text-neutral-500'}`}>{d.dayName}</span>
                  <span className="text-[9px] font-mono text-neutral-600">{d.dateStr}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="h-10 border-t border-white/5 hover:bg-white/5 text-neutral-500 flex items-center justify-center gap-2 transition-colors cursor-pointer">
            <ChevronDown size={12} strokeWidth={3} />
          </button>
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#050505] flex flex-col">
          <div className="h-10 border-b border-white/5 bg-[#0a0a0a] relative min-w-max shrink-0 px-12 z-30">
            {tasks.map((task, idx) => (
              <div
                key={task.id}
                style={{ left: `${getColLeft(idx)}px`, width: `${COLUMN_WIDTH}px` }}
                className={`absolute h-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  selectedTaskId === task.id ? 'text-white' : 'text-neutral-400'
                }`}
              >
                <span>{task.title}</span>
                {task.streak > 0 && <span className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">🔥{task.streak}</span>}
              </div>
            ))}
          </div>

          <div className="relative min-w-max w-full" style={{ height: `${7 * ROW_HEIGHT + 100}px` }}>
            <StaticGridWires />
            <DynamicFluidLayer tasks={tasks} selectedTaskId={selectedTaskId} onSelectTask={setSelectedTaskId} />
          </div>
        </main>
      </div>

      {/* BOTTOM CONTROLS PANEL */}
      <footer className="h-16 border-t border-white/10 bg-[#0a0a0a] flex items-center justify-between px-8 shrink-0 z-40">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Selected:</span>
          <span className="text-[12px] font-black uppercase tracking-widest text-white">
            {selectedTask ? selectedTask.title : 'None'}
          </span>
        </div>

        <div className="flex gap-4">
          {/* START TODAY */}
          <button
            disabled={!selectedTask || todayStatus === 2}
            onClick={() => handleAction('START')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors ${
              !selectedTask || todayStatus === 2
                ? 'bg-white/5 text-white/20 cursor-default'
                : 'bg-white text-black hover:bg-neutral-200 cursor-pointer'
            }`}
          >
            <Play size={14} fill={!selectedTask || todayStatus === 2 ? 'currentColor' : 'black'} />
            <span>Start Today</span>
          </button>

          {/* MARK ENDED / STOP */}
          <button
            disabled={!selectedTask || todayStatus !== 2}
            onClick={() => handleAction('STOP')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors border ${
              !selectedTask || todayStatus !== 2
                ? 'border-white/5 text-white/20 cursor-default'
                : 'border-white text-white hover:bg-white/10 cursor-pointer'
            }`}
          >
            <Square size={14} fill={!selectedTask || todayStatus !== 2 ? 'currentColor' : 'white'} />
            <span>Mark Ended</span>
          </button>

          {/* UNDO / DELETE TODAY */}
          <button
            disabled={!selectedTask || todayStatus === 0}
            onClick={() => handleAction('UNDO')}
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
    </div>
  );
}