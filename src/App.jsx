import React, { useState, useRef, useEffect } from 'react';
import { Plus, Play, Square, RotateCcw, FastForward, Rewind, LocateFixed, Trash2, X, Check } from 'lucide-react';
import {
  ROW_HEIGHT,
  TRACK_WIDTH,
  COLUMN_WIDTH,
  CANVAS_PAD_Y,
  BASE_CURRENT_DAY_INDEX,
  TIMELINE_DAYS,
  HABIT_PALETTE,
  TASK_PALETTE,
  INITIAL_HABITS,
  INITIAL_TASKS,
  getColLeft,
  parseHabitBlocks,
  parseTaskMatrix,
  executeMatrixAction,
  shiftCurrentDay,
  toggleHabitToday,
  insertNewTask,
  insertNewHabit,
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

  // Modals state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', colorIdx: 0, position: 1 });

  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [habitForm, setHabitForm] = useState({ label: '', colorIdx: 0, position: 1 });

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState(null);
  const [editValue, setEditValue] = useState('');
  
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

  // --- TASK ACTIONS ---
  const handleOpenTaskModal = () => {
    setTaskForm({ title: '', colorIdx: tasks.length % TASK_PALETTE.length, position: tasks.length + 1 });
    setTaskModalOpen(true);
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setTasks((prev) =>
      insertNewTask(
        prev,
        {
          title: taskForm.title,
          colorObj: TASK_PALETTE[taskForm.colorIdx],
          position: parseInt(taskForm.position, 10),
        },
        TIMELINE_DAYS.length
      )
    );
    setTaskModalOpen(false);
  };

  const handleDeleteTask = (taskId) => {
    if (!taskId) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
  };

  // --- HABIT ACTIONS ---
  const handleOpenHabitModal = () => {
    setHabitForm({ label: '', colorIdx: habits.length % HABIT_PALETTE.length, position: habits.length + 1 });
    setHabitModalOpen(true);
  };

  const handleCreateHabit = (e) => {
    e.preventDefault();
    if (!habitForm.label.trim()) return;
    setHabits((prev) =>
      insertNewHabit(
        prev,
        {
          label: habitForm.label,
          colorObj: HABIT_PALETTE[habitForm.colorIdx],
          position: parseInt(habitForm.position, 10),
        },
        TIMELINE_DAYS.length
      )
    );
    setHabitModalOpen(false);
  };

  const handleDeleteHabit = (e, habitId) => {
    e.stopPropagation();
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
  };

  const handleHabitClick = (habitId, dayIndex) => {
    setHabits((prev) => toggleHabitToday(prev, habitId, dayIndex, currentDay));
  };

  // --- INLINE EDITING ---
  const handleStartRename = (id, currentTitle) => {
    setEditingItemId(id);
    setEditValue(currentTitle);
  };

  const handleSaveRename = (type, id) => {
    if (type === 'task') {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title: editValue.trim() || t.title } : t))
      );
    } else {
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, label: (editValue.trim() || h.label).substring(0, 5).toUpperCase() } : h))
      );
    }
    setEditingItemId(null);
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

  // Dynamic habit width based on count (at least 32px per habit lane + padding)
  const habitRailWidth = Math.max(140, habits.length * 36 + 28);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070707] text-white font-mono select-none overflow-hidden relative">
      
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
          <button
            onClick={() => centerCurrentWeek(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            title="Recenter view to current week (Sun–Sat)"
          >
            <LocateFixed size={13} />
            <span>Focus Week</span>
          </button>

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
              title="Advance 1 day"
            >
              <FastForward size={12} />
            </button>
          </div>

          <button
            onClick={handleOpenTaskModal}
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
            className="border-r border-white/5 flex items-center justify-around px-2 shrink-0 relative"
          >
            {habits.map((h) => (
              <div 
                key={h.id} 
                className="relative group/h flex items-center justify-center cursor-pointer"
                onDoubleClick={() => handleStartRename(h.id, h.label)}
                title="Double click to rename"
              >
                {editingItemId === h.id ? (
                  <input
                    type="text"
                    maxLength={5}
                    value={editValue}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveRename('habit', h.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRename('habit', h.id)}
                    className="w-12 bg-black border border-white/30 rounded px-1 text-[9px] text-center text-white outline-none"
                  />
                ) : (
                  <span className="text-[8px] tracking-wider text-neutral-500 group-hover/h:text-white font-black uppercase rotate-[-45deg] origin-bottom-left -translate-y-2 translate-x-2 transition-colors">
                    {h.label}
                  </span>
                )}
                
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
              onClick={handleOpenHabitModal}
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
                onDoubleClick={() => handleStartRename(task.id, task.title)}
                title="Double click to rename"
                className={`absolute h-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
                  selectedTaskId === task.id ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {editingItemId === task.id ? (
                  <input
                    type="text"
                    maxLength={16}
                    value={editValue}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveRename('task', task.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRename('task', task.id)}
                    className="w-28 bg-black border border-white/30 rounded px-1.5 py-0.5 text-[10px] text-center text-white outline-none"
                  />
                ) : (
                  <>
                    <span>{task.title}</span>
                    {task.streak > 0 && (
                      <span className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                        🔥{task.streak}
                      </span>
                    )}
                  </>
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
          {/* Continuous Habit Rails with Merging Fluid Blocks */}
          <div 
            style={{ width: `${habitRailWidth}px`, height: `${totalStreamHeight}px` }} 
            className="border-r border-white/5 bg-[#080808]/90 shrink-0 z-10 relative"
          >
            {habits.map((habit, hIdx) => {
              const blocks = parseHabitBlocks(habit.data);
              const laneX = (habitRailWidth / (habits.length + 1)) * (hIdx + 1);

              return (
                <div key={habit.id} className="absolute inset-y-0" style={{ left: `${laneX - 8}px`, width: '16px' }}>
                  {/* Guideline track */}
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/5 rounded-full" />

                  {/* Render merged fluid capsules */}
                  {blocks.map((b, bIdx) => {
                    const top = CANVAS_PAD_Y + b.start * ROW_HEIGHT + 14;
                    const height = b.days * ROW_HEIGHT - 28;
                    return (
                      <div
                        key={bIdx}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        className={`absolute left-1/2 -translate-x-1/2 w-[5px] rounded-full ${habit.color} shadow-[0_0_8px_${habit.hex}40] transition-all duration-200 pointer-events-none`}
                      />
                    );
                  })}

                  {/* Interactive hit areas per day for Today's row */}
                  {TIMELINE_DAYS.map((d) => (
                    <div
                      key={d.dayIndex}
                      style={{ top: `${CANVAS_PAD_Y + d.dayIndex * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                      onClick={() => handleHabitClick(habit.id, d.dayIndex)}
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

      {/* ========================================================= */}
      {/* CENTER FLOATING CARD MODAL: CREATE NEW TASK */}
      {/* ========================================================= */}
      {taskModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-white">Create Task Column</span>
              <button 
                onClick={() => setTaskModalOpen(false)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">Task Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Engine 3D..."
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">Color Accent</label>
                <div className="flex items-center gap-2">
                  {TASK_PALETTE.map((c, i) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setTaskForm({ ...taskForm, colorIdx: i })}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                        taskForm.colorIdx === i ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {taskForm.colorIdx === i && <Check size={12} className="text-black stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
                  Slot Position (1 to {tasks.length + 1})
                </label>
                <input
                  type="number"
                  min={1}
                  max={tasks.length + 1}
                  value={taskForm.position}
                  onChange={(e) => setTaskForm({ ...taskForm, position: e.target.value })}
                  className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
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
      )}

      {/* ========================================================= */}
      {/* CENTER FLOATING CARD MODAL: CREATE NEW HABIT */}
      {/* ========================================================= */}
      {habitModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-white">Create Habit Track</span>
              <button 
                onClick={() => setHabitModalOpen(false)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="flex flex-col gap-4">
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
                  value={habitForm.label}
                  onChange={(e) => setHabitForm({ ...habitForm, label: e.target.value.toUpperCase() })}
                  className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs text-white uppercase outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">Color Accent</label>
                <div className="flex items-center gap-2">
                  {HABIT_PALETTE.map((c, i) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setHabitForm({ ...habitForm, colorIdx: i })}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                        habitForm.colorIdx === i ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {habitForm.colorIdx === i && <Check size={12} className="text-black stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
                  Slot Position (1 to {habits.length + 1})
                </label>
                <input
                  type="number"
                  min={1}
                  max={habits.length + 1}
                  value={habitForm.position}
                  onChange={(e) => setHabitForm({ ...habitForm, position: e.target.value })}
                  className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setHabitModalOpen(false)}
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
      )}

    </div>
  );
}