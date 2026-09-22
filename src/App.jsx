import React from 'react';
import { Plus, ChevronUp, ChevronDown } from 'lucide-react';

// STAGE GEOMETRY (Absolute Grid System)
const ROW_HEIGHT = 72; 
const TRACK_WIDTH = 44; 
const COLUMN_WIDTH = 140;
const COLUMN_GAP = 40; 
const CANVAS_PAD_X = 48; // Replaces CSS px-12
const CANVAS_PAD_Y = 24; // Replaces CSS top-6 / mt-6

// Calculate exact X position baked with padding
const getColLeft = (idx) => CANVAS_PAD_X + idx * (COLUMN_WIDTH + COLUMN_GAP);
const getColCenter = (idx) => getColLeft(idx) + COLUMN_WIDTH / 2;

// The Fixed Weekly Grid (Today is Thursday)
const WEEK_DAYS = [
  { dayIndex: 0, dayName: 'SUN', dateStr: '20/09' },
  { dayIndex: 1, dayName: 'MON', dateStr: '21/09' },
  { dayIndex: 2, dayName: 'TUE', dateStr: '22/09' },
  { dayIndex: 3, dayName: 'WED', dateStr: '23/09' },
  { dayIndex: 4, dayName: 'THU', dateStr: '24/09', isToday: true }, // Current Day
  { dayIndex: 5, dayName: 'FRI', dateStr: '25/09' },
  { dayIndex: 6, dayName: 'SAT', dateStr: '26/09' },
];

// Multi-Column Habit Rails
const HABITS = [
  { id: 'code', label: 'CODE', color: 'bg-cyan-400', hex: '#22d3ee', data: [1, 1, 1, 1, 1, 0, 0] },
  { id: 'gym', label: 'GYM', color: 'bg-rose-400', hex: '#fb7185', data: [0, 1, 0, 1, 1, 0, 0] },
  { id: 'diet', label: 'DIET', color: 'bg-emerald-400', hex: '#34d399', data: [1, 1, 1, 0, 1, 0, 0] }
];

// SPRINT DATA: Pure tracking (No planning envelopes)
const SPRINT_DATA = [
  {
    id: 'col-1', 
    title: '2D Animation', 
    colorClass: 'bg-emerald-400', 
    hex: '#34d399',
    start: 1, days: 2, // Mon 00:00 to Tue 24:00
    streak: 3 // 3 Week streak!
  },
  {
    id: 'col-2', 
    title: 'Motor Design', 
    colorClass: 'bg-indigo-400', 
    hex: '#818cf8',
    start: 3, days: 0.5, // Wed 00:00 to Wed 12:00
    streak: 0 // Broken or new streak
  },
  {
    id: 'col-3', 
    title: '3D Animation', 
    colorClass: 'bg-amber-400', 
    hex: '#fbbf24',
    start: 3.5, days: 1.5, // Wed 12:00 to Thu 24:00 (Ongoing)
    streak: 5 // 5 Week streak!
  }
];

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#070707] text-white font-mono select-none overflow-hidden">
      
      {/* 1. TOP HEADER */}
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
        <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors text-[10px] font-black tracking-widest uppercase">
          <Plus size={14} strokeWidth={3} />
          <span>New Task</span>
        </button>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 2. MULTI-COLUMN HABIT RAILS */}
        <aside className="w-32 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 z-20">
          <div className="h-10 border-b border-white/5 flex items-center justify-center px-2">
            <div className="flex w-full justify-around">
              {HABITS.map(h => (
                <span key={h.id} className="text-[8px] tracking-wider text-neutral-500 font-black uppercase rotate-[-45deg] origin-bottom-left -translate-y-2 translate-x-2">
                  {h.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col py-6">
            {WEEK_DAYS.map((d) => (
              <div key={d.dayIndex} style={{ height: `${ROW_HEIGHT}px` }} className="w-full flex items-center justify-around px-4">
                {HABITS.map(habit => {
                  const isDone = habit.data[d.dayIndex];
                  const isFuture = d.dayIndex > 4; // After Thursday
                  return (
                    <div key={habit.id} className="relative h-full flex items-center justify-center w-4">
                      <div className="absolute inset-y-1 w-[2px] bg-white/5 rounded-full" />
                      <div className={`absolute w-[4px] rounded-full transition-all duration-500 ${
                          isDone ? `h-10 ${habit.color} shadow-[0_0_10px_${habit.hex}40]` : 'h-0'
                        } ${isFuture ? 'opacity-20' : 'opacity-100'}`}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="h-10 border-t border-white/5" />
        </aside>

        {/* 3. DATES LIST */}
        <aside className="w-28 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 z-30 shadow-[10px_0_20px_rgba(0,0,0,0.5)]">
          <button className="h-10 border-b border-white/5 hover:bg-white/5 text-neutral-500 flex items-center justify-center gap-2 text-[9px] font-black tracking-widest transition-colors uppercase">
            <ChevronUp size={12} strokeWidth={3} />
          </button>
          <div className="flex-1 flex flex-col py-6">
            {WEEK_DAYS.map((d) => (
              <div key={d.dayIndex} style={{ height: `${ROW_HEIGHT}px` }} className="flex items-center px-3">
                <div className={`w-full py-2 px-2 rounded flex flex-col items-center justify-center border transition-all ${
                    d.isToday ? 'border-white/20 bg-white/10 shadow-sm' : 'border-transparent'
                  }`}
                >
                  <span className={`text-[10px] font-black ${d.isToday ? 'text-white' : 'text-neutral-500'}`}>{d.dayName}</span>
                  <span className="text-[9px] font-mono text-neutral-600">{d.dateStr}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="h-10 border-t border-white/5 hover:bg-white/5 text-neutral-500 flex items-center justify-center gap-2 text-[9px] font-black tracking-widest transition-colors uppercase">
            <ChevronDown size={12} strokeWidth={3} />
          </button>
        </aside>

        {/* 4. MAIN STORY CANVAS */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden bg-[#050505] flex flex-col">
          
          {/* Strict Absolute Column Titles */}
          <div className="h-10 border-b border-white/5 bg-[#0a0a0a] relative min-w-max shrink-0 px-12">
            {SPRINT_DATA.map((task, idx) => (
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

          {/* STRICT ABSOLUTE SCROLLING CANVAS (Zero CSS offset bugs) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
            <div className="relative min-w-max w-full" style={{ height: `${7 * ROW_HEIGHT + 100}px` }}>
              
              {/* Z-0: Background Grid Wires */}
              <div className="absolute inset-0 pointer-events-none z-0">
                {WEEK_DAYS.map((d) => (
                  <div key={d.dayIndex} style={{ top: `${CANVAS_PAD_Y + d.dayIndex * ROW_HEIGHT}px` }} className="absolute w-full flex items-center">
                    <div className={`w-full border-b ${d.isToday ? 'border-white/15 shadow-[0_0_8px_rgba(255,255,255,0.1)]' : 'border-white/5'}`} />
                  </div>
                ))}
              </div>

             
              {/* Z-20: Task Tracking Columns */}
              <div className="absolute inset-0 z-20 pointer-events-none">
                {SPRINT_DATA.map((task, idx) => {
                  const hasActual = task.start !== null && task.start !== undefined;
                  if (!hasActual) return null;

                  const actualTop = CANVAS_PAD_Y + task.start * ROW_HEIGHT;
                  const actualHeight = task.days * ROW_HEIGHT;

                  return (
                    <div 
                      key={task.id} 
                      style={{ left: `${getColLeft(idx)}px`, width: `${COLUMN_WIDTH}px` }} 
                      className="absolute h-full flex justify-center"
                    >
                      {/* Sub-lane center guideline */}
                      <div className="absolute inset-y-0 w-[1px] bg-white/5" />

                      {/* UMBILICAL CORD (Carrying the Streak Momentum) */}
                      {task.streak > 0 && (
                        <div 
                          style={{ top: 0, height: `${actualTop}px` }}
                          className={`absolute w-[3px] opacity-70 ${task.colorClass} shadow-[0_0_12px_${task.hex}60]`}
                        />
                      )}

                      {/* Solid Time Fluid (The Reality) */}
                      <div
                        style={{ top: `${actualTop}px`, height: `${actualHeight}px`, width: `${TRACK_WIDTH}px` }}
                        className={`absolute rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center ${task.colorClass}`}
                      >
                         <span className="text-[10px] font-black text-black/60 rotate-90">{task.days}d</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}