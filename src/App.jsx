import React, { useState, useRef, useEffect } from 'react';
import { Plus, Play, Square, RotateCcw, FastForward, Rewind, LocateFixed, Trash2, X } from 'lucide-react';
import {
  ROW_HEIGHT,
  TRACK_WIDTH,
  COLUMN_WIDTH,
  CANVAS_PAD_Y,
  BASE_CURRENT_DAY_INDEX,
  TIMELINE_DAYS,
  INITIAL_HABITS,
  INITIAL_TASKS,
  getColLeft,
  parseTaskMatrix,
  executeMatrixAction,
  shiftCurrentDay,
  toggleHabitToday,
  createNewHabit,
  createNewTask,
} from './trackerStore';

function StaticGridWires({ currentDay }) {
  return (
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
                ? 'border-white/20 shadow-[0_0_8px_rgba(255,255,255,0.15)]' 
                : d.dayIndex % 7 === 0 
                  ? 'border-white/15' 
                  : 'border-white/5'
            }`} 
          />
        </div>
      ))}
    </div>
  );
}

function DynamicFluidLayer({ tasks, selectedTaskId, onSelectTask, currentDay }) {
  return (
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

            {/* Contiguous Fluid Blocks */}
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
  const [currentDay, setCurrentDay] = useState(BASE_CURRENT_DAY_INDEX);
  
  const scrollContainerRef = useRef(null);

  const centerCurrentWeek = (smooth = true) => {
    if (!scrollContainerRef.current) return;
    const currentWeekStartDay = Math.floor(currentDay / 7) * 7;
    const targetScroll = CANVAS_PAD_Y + currentWeekStartDay * ROW_HEIGHT - 12;
    scrollContainerRef.current.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    centerCurrentWeek(false);
  }, []);

  // --- ACTIONS ---
  const handleNewTaskPrompt = () => {
    const title = window.prompt('Enter new task name:');
    if (title && title.trim()) {
      setTasks((prev) => createNewTask(prev, title, TIMELINE_DAYS.length));
    }
  };

  const handleDeleteTask = (taskId) => {
    if (!taskId) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
  };

  const handleAddHabit = () => {
    const label = window.prompt('Enter habit label (max 4 chars, e.g. READ):');
    if (label && label.trim()) {
      setHabits((prev) => createNewHabit(prev, label, TIMELINE_DAYS.length));
    }
  };

  const handleDeleteHabit = (e, habitId) => {
    e.stopPropagation();
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
  };

  const handleHabitClick = (habitId, dayIndex) => {
    setHabits((prev) => toggleHabitToday(prev, habitId, dayIndex, currentDay));
  };

  const handleAction = (action) => {
    if (!selectedTaskId) return;
    setTasks((prev) => executeMatrixAction(prev, selectedTaskId, action, currentDay));
  };

  const handleShiftDay = (delta) => {
    const nextDay = Math.min(Math.max(0, currentDay + delta), TIMELINE_DAYS.length - 1);
    if (nextDay !== currentDay) {
      setTasks((prev) => shiftCurrentDay(prev, currentDay, nextDay));
      setCurrentDay(nextDay);
    }
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const todayStatus = selectedTask ? selectedTask.matrix[currentDay] : 0;
  const totalStreamHeight = CANVAS_PAD_Y + TIMELINE_DAYS.length * ROW_HEIGHT + 120;
  const currentDayInfo = TIMELINE_DAYS[currentDay];

  // Dynamically calculate habit rail width to ensure fit
  const habitRailWidth = Math.max(128, habits.length * 36 + 24);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070707] text-white font-mono select-none overflow-hidden">
      
      {/* HEADER */}
      <header className="h-14 border-b border-white/10 bg-[#0a0a0a] flex items-center px-6 shrink-0 z-40 justify-between">
        <div className="flex items-center gap-6">
          <span className="text-[11px] font-black tracking-[0.2em] uppercase text-neutral-500">Sprint Board</span>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="text-[11px] text-neutral-300 font-bold tracking-widest uppercase">
            Week {currentDayInfo.weekNum} <span className="text-neutral-600 mx-2">/</span> {currentDayInfo.dayName} {currentDayInfo.dateStr}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* CENTER CURRENT WEEK BUTTON */}
          <button
            onClick={() => centerCurrentWeek(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            title="Recenter view to current week (Sun–Sat)"
          >
            <LocateFixed size={13} />
            <span>Focus Week</span>
          </button>

          {/* SIMULATE DATE SHIFT */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider mr-1">Simulate:</span>
            <button 
              onClick={() => handleShiftDay(-1)} 
              className="p-1 hover:bg-white/10 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
              title="Go back 1 day"
            >
              <Rewind size={12} />
            </button>
            <span className="text-[10px] font-bold px-1 text-white">{currentDayInfo.dateStr}</span>
            <button 
              onClick={() => handleShiftDay(1)} 
              className="p-1 hover:bg-white/10 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
              title="Advance 1 day (Flows active tasks downward)"
            >
              <FastForward size={12} />
            </button>
          </div>

          {/* NEW TASK BUTTON */}
          <button
            onClick={handleNewTaskPrompt}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors text-[10px] font-black tracking-widest uppercase cursor-pointer"
          >
            <Plus size={14} strokeWidth={3} />
            <span>New Task</span>
          </button>
        </div>
      </header>

      {/* SYNCHRONIZED STREAM BODY */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* STICKY COLUMN TITLES BAR */}
        <div className="h-10 border-b border-white/5 bg-[#0a0a0a] flex shrink-0 z-30">
          
          {/* Habits Header */}
          <div 
            style={{ width: `${habitRailWidth}px` }} 
            className="border-r border-white/5 flex items-center justify-around px-2 shrink-0 relative group"
          >
            {habits.map((h) => (
              <div key={h.id} className="relative group/h flex items-center justify-center">
                <span className="text-[8px] tracking-wider text-neutral-500 group-hover/h:text-white font-black uppercase rotate-[-45deg] origin-bottom-left -translate-y-2 translate-x-2 transition-colors">
                  {h.label}
                </span>
                <button
                  onClick={(e) => handleDeleteHabit(e, h.id)}
                  title={`Delete ${h.label}`}
                  className="absolute -top-1 -right-2 hidden group-hover/h:flex items-center justify-center w-3 h-3 bg-red-500/80 hover:bg-red-500 text-white rounded-full cursor-pointer z-40"
                >
                  <X size={8} />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddHabit}
              title="Add Habit Lane"
              className="ml-1 p-1 hover:bg-white/10 rounded text-neutral-500 hover:text-white transition-colors cursor-pointer"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Date Label Spacer */}
          <div className="w-28 border-r border-white/5 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">DATE</span>
          </div>

          {/* Task Column Headers */}
          <div className="flex-1 relative overflow-hidden min-w-max">
            {tasks.map((task, idx) => (
              <div
                key={task.id}
                style={{ left: `${getColLeft(idx)}px`, width: `${COLUMN_WIDTH}px` }}
                className={`absolute h-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  selectedTaskId === task.id ? 'text-white' : 'text-neutral-400'
                }`}
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
        </div>

        {/* UNIFIED VERTICAL SCROLL STREAM */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden flex relative bg-[#050505] no-scrollbar"
        >
          {/* Habit Rails */}
          <div 
            style={{ width: `${habitRailWidth}px`, height: `${totalStreamHeight}px` }} 
            className="border-r border-white/5 bg-[#080808]/90 shrink-0 z-10 relative"
          >
            {TIMELINE_DAYS.map((d) => (
              <div 
                key={d.dayIndex} 
                style={{ top: `${CANVAS_PAD_Y + d.dayIndex * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }} 
                className="absolute w-full flex items-center justify-around px-4"
              >
                {habits.map((habit) => {
                  const isDone = habit.data[d.dayIndex];
                  const isToday = d.dayIndex === currentDay;
                  return (
                    <div
                      key={habit.id}
                      onClick={() => handleHabitClick(habit.id, d.dayIndex)}
                      className={`relative h-full flex items-center justify-center w-4 ${
                        isToday ? 'cursor-pointer' : 'cursor-default opacity-40'
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
                    d.dayIndex === currentDay ? 'border-white/20 bg-white/10 shadow-sm' : 'border-transparent'
                  }`}
                >
                  <span className={`text-[10px] font-black ${d.dayIndex === currentDay ? 'text-white' : 'text-neutral-500'}`}>
                    {d.dayName}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-600">{d.dateStr}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Main Continuous Canvas */}
          <div className="flex-1 relative min-w-max" style={{ height: `${totalStreamHeight}px` }}>
            <StaticGridWires currentDay={currentDay} />
            <DynamicFluidLayer 
              tasks={tasks} 
              selectedTaskId={selectedTaskId} 
              onSelectTask={setSelectedTaskId} 
              currentDay={currentDay}
            />
          </div>

        </div>
      </div>

      {/* BOTTOM CONTROLS PANEL */}
      <footer className="h-16 border-t border-white/10 bg-[#0a0a0a] flex items-center justify-between px-8 shrink-0 z-40">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Selected:</span>
          <span className="text-[12px] font-black uppercase tracking-widest text-white">
            {selectedTask ? selectedTask.title : 'None'}
          </span>
          {selectedTask && (
            <button
              onClick={() => handleDeleteTask(selectedTask.id)}
              className="flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
              title="Delete task lane entirely"
            >
              <Trash2 size={12} />
              <span>Delete Column</span>
            </button>
          )}
        </div>

        <div className="flex gap-4">
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