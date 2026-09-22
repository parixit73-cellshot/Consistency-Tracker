import React, { useState } from 'react';
import { Plus, ChevronUp, ChevronDown } from 'lucide-react';
export const ROW_HEIGHT = 72;
export const TRACK_WIDTH = 44;
export const COLUMN_WIDTH = 140;
export const COLUMN_GAP = 40;
export const CANVAS_PAD_X = 48;
export const CANVAS_PAD_Y = 24;

export const CURRENT_DAY_INDEX = 4; // Thursday

export const getColLeft = (idx) => CANVAS_PAD_X + idx * (COLUMN_WIDTH + COLUMN_GAP);

export const WEEK_DAYS = [
  { dayIndex: 0, dayName: 'SUN', dateStr: '20/09' },
  { dayIndex: 1, dayName: 'MON', dateStr: '21/09' },
  { dayIndex: 2, dayName: 'TUE', dateStr: '22/09' },
  { dayIndex: 3, dayName: 'WED', dateStr: '23/09' },
  { dayIndex: 4, dayName: 'THU', dateStr: '24/09', isToday: true },
  { dayIndex: 5, dayName: 'FRI', dateStr: '25/09' },
  { dayIndex: 6, dayName: 'SAT', dateStr: '26/09' },
];

export const INITIAL_HABITS = [
  { id: 'code', label: 'CODE', color: 'bg-cyan-400', hex: '#22d3ee', data: [1, 1, 1, 1, 1, 0, 0] },
  { id: 'gym', label: 'GYM', color: 'bg-rose-400', hex: '#fb7185', data: [0, 1, 0, 1, 1, 0, 0] },
  { id: 'diet', label: 'DIET', color: 'bg-emerald-400', hex: '#34d399', data: [1, 1, 1, 0, 1, 0, 0] }
];

export const INITIAL_TASKS = [
  {
    id: 'col-1',
    title: '2D Animation',
    colorClass: 'bg-emerald-400',
    hex: '#34d399',
    streak: 3,
    segments: [{ start: 1, days: 2 }],
  },
  {
    id: 'col-2',
    title: 'Motor Design',
    colorClass: 'bg-indigo-400',
    hex: '#818cf8',
    streak: 0,
    segments: [],
  },
  {
    id: 'col-3',
    title: '3D Animation',
    colorClass: 'bg-amber-400',
    hex: '#fbbf24',
    streak: 5,
    segments: [{ start: 3, days: 2, isTodayActive: true }],
  },
];

export const TASK_COLORS = [
  { class: 'bg-blue-400', hex: '#60a5fa' },
  { class: 'bg-purple-400', hex: '#c084fc' },
  { class: 'bg-pink-400', hex: '#f472b6' },
  { class: 'bg-orange-400', hex: '#fb923c' }
];

// --- CORE APPLICATION LOGIC ENGINES ---

export function toggleHabitToday(habits, habitId, dayIndex) {
  if (dayIndex !== CURRENT_DAY_INDEX) return habits;

  return habits.map((h) => {
    if (h.id !== habitId) return h;
    const nextData = [...h.data];
    nextData[dayIndex] = nextData[dayIndex] ? 0 : 1;
    return { ...h, data: nextData };
  });
}

export function toggleTaskToday(tasks, taskId) {
  return tasks.map((task) => {
    if (task.id !== taskId) return task;

    const activeSegIdx = task.segments.findIndex(
      (s) => s.isTodayActive || (s.start <= CURRENT_DAY_INDEX && s.start + s.days > CURRENT_DAY_INDEX)
    );

    if (activeSegIdx !== -1) {
      const seg = task.segments[activeSegIdx];
      // Past day start (e.g. Wednesday): trim to freeze past time
      if (seg.start < CURRENT_DAY_INDEX) {
        const pastDays = CURRENT_DAY_INDEX - seg.start;
        const updated = [...task.segments];
        updated[activeSegIdx] = {
          start: seg.start,
          days: pastDays,
          isTodayActive: false,
        };
        return { ...task, segments: updated };
      }

      // Started today: remove today's block
      return {
        ...task,
        segments: task.segments.filter((_, idx) => idx !== activeSegIdx),
      };
    }

    // Inactive on Thursday: append a segment for today
    return {
      ...task,
      segments: [
        ...task.segments,
        { start: CURRENT_DAY_INDEX, days: 1, isTodayActive: true },
      ],
    };
  });
}

export function createNewTask(tasks, title) {
  const colorObj = TASK_COLORS[tasks.length % TASK_COLORS.length];
  return [
    ...tasks,
    {
      id: `col-${Date.now()}`,
      title: title.substring(0, 12),
      colorClass: colorObj.class,
      hex: colorObj.hex,
      streak: 0,
      segments: [],
    },
  ];
}

function StaticGridWires() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {WEEK_DAYS.map((d) => (
        <div
          key={d.dayIndex}
          style={{ top: `${CANVAS_PAD_Y + d.dayIndex * ROW_HEIGHT}px` }}
          className="absolute w-full flex items-center"
        >
          <div
            className={`w-full border-b ${
              d.isToday ? 'border-white/15 shadow-[0_0_8px_rgba(255,255,255,0.1)]' : 'border-white/5'
            }`}
          />
        </div>
      ))}
    </div>
  );
}

function DynamicFluidLayer({ tasks, onColumnClick }) {
  return (
    <div className="absolute inset-0 z-20">
      {tasks.map((task, idx) => {
        const firstSegment = task.segments[0];
        const umbilicalHeight = firstSegment
          ? CANVAS_PAD_Y + firstSegment.start * ROW_HEIGHT
          : CANVAS_PAD_Y + CURRENT_DAY_INDEX * ROW_HEIGHT;

        return (
          <div
            key={task.id}
            style={{ left: `${getColLeft(idx)}px`, width: `${COLUMN_WIDTH}px` }}
            className="absolute h-full flex justify-center cursor-pointer hover:bg-white/[0.02] transition-colors"
            onClick={() => onColumnClick(task.id)}
          >
            <div className="absolute inset-y-0 w-[1px] bg-white/5 pointer-events-none" />

            {task.streak > 0 && (
              <div
                style={{ top: 0, height: `${umbilicalHeight}px` }}
                className={`absolute w-[3px] opacity-70 ${task.colorClass} shadow-[0_0_12px_${task.hex}60] pointer-events-none`}
              />
            )}

            {task.segments.map((seg, sIdx) => {
              const top = CANVAS_PAD_Y + seg.start * ROW_HEIGHT;
              const height = seg.days * ROW_HEIGHT;

              return (
                <div
                  key={sIdx}
                  style={{ top: `${top}px`, height: `${height}px`, width: `${TRACK_WIDTH}px` }}
                  className={`absolute rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center ${task.colorClass} pointer-events-none transition-all duration-200`}
                >
                  <span className="text-[10px] font-black text-black/60 rotate-90">
                    {seg.days}d
                  </span>
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

  const handleNewTaskPrompt = () => {
    const title = window.prompt('Enter new task name:');
    if (title) setTasks((prev) => createNewTask(prev, title));
  };

  const handleHabitClick = (habitId, dayIndex) => {
    setHabits((prev) => toggleHabitToday(prev, habitId, dayIndex));
  };

  const handleTaskClick = (taskId) => {
    setTasks((prev) => toggleTaskToday(prev, taskId));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070707] text-white font-mono select-none overflow-hidden">
      <header className="h-14 border-b border-white/10 bg-[#0a0a0a] flex items-center px-6 shrink-0 z-30 justify-between">
        <div className="flex items-center gap-8">
          <span className="text-[11px] font-black tracking-[0.2em] uppercase text-neutral-500">
            Sprint Board
          </span>
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
              <div
                key={d.dayIndex}
                style={{ height: `${ROW_HEIGHT}px` }}
                className="w-full flex items-center justify-around px-4"
              >
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
                  <span className={`text-[10px] font-black ${d.isToday ? 'text-white' : 'text-neutral-500'}`}>
                    {d.dayName}
                  </span>
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
                className="absolute h-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400"
              >
                <span>{task.title}</span>
                {task.streak > 0 && (
                  <span className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                    🔥{task.streak}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="relative min-w-max w-full" style={{ height: `${7 * ROW_HEIGHT + 100}px` }}>
            <StaticGridWires />
            <DynamicFluidLayer tasks={tasks} onColumnClick={handleTaskClick} />
          </div>
        </main>
      </div>
    </div>
  );
}