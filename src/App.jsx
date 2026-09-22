import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Play, Square, RotateCcw, FastForward, Rewind, LocateFixed, 
  Trash2, X, Archive, Download, Upload, ShieldAlert, RefreshCw, History 
} from 'lucide-react';
import {
  ROW_HEIGHT,
  TRACK_WIDTH,
  COLUMN_WIDTH,
  CANVAS_PAD_Y,
  BASE_CURRENT_DAY_INDEX,
  TIMELINE_DAYS,
  loadPersistedTasks,
  loadPersistedHabits,
  persistState,
  getColLeft,
  parseHabitBlocks,
  parseTaskMatrix,
  executeMatrixAction,
  shiftCurrentDay,
  toggleHabitToday,
  renameTask,
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

            {/* Contiguous Fluid Blocks */}
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
  );
}

export default function App() {
  const [tasks, setTasks] = useState(loadPersistedTasks);
  const [habits, setHabits] = useState(loadPersistedHabits);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [currentDay, setCurrentDay] = useState(BASE_CURRENT_DAY_INDEX);

  // Modals & Panels
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', hex: '#34d399', position: 1 });

  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [habitForm, setHabitForm] = useState({ label: '', hex: '#22d3ee', position: 1 });

  const [vaultOpen, setVaultOpen] = useState(false);
  const [purgeConfirmId, setPurgeConfirmId] = useState(null);
  const [purgeInputText, setPurgeInputText] = useState('');

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Real-time State Auto-Sync
  useEffect(() => {
    persistState(tasks, habits);
  }, [tasks, habits]);

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

  // Filter Active vs Archived Tasks
  const activeTasks = tasks.filter((t) => !t.isArchived);
  const archivedTasks = tasks.filter((t) => t.isArchived);

  // --- ACTIONS ---
  const handleOpenTaskModal = () => {
    setTaskForm({ title: '', hex: '#34d399', position: activeTasks.length + 1 });
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
          hex: taskForm.hex,
          position: parseInt(taskForm.position, 10),
        },
        TIMELINE_DAYS.length
      )
    );
    setTaskModalOpen(false);
  };

  // Safe Deletion: Move to Vault
  const handleArchiveTask = (taskId) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isArchived: true } : t)));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
  };

  // Safe Restoration: Respawn from Vault
  const handleRestoreTask = (taskId) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isArchived: false } : t)));
  };

  // Hard Delete: Purge with typed confirmation
  const handleHardPurgeTask = (taskId) => {
    if (purgeInputText !== 'DELETE') return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setPurgeConfirmId(null);
    setPurgeInputText('');
  };

  const handleOpenHabitModal = () => {
    setHabitForm({ label: '', hex: '#22d3ee', position: habits.length + 1 });
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
          hex: habitForm.hex,
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

  const handleStartRename = (id, currentTitle) => {
    setEditingItemId(id);
    setEditValue(currentTitle);
  };

  const handleSaveRename = (type, id) => {
    if (type === 'task') {
      setTasks((prev) => renameTask(prev, id, editValue));
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

  // Full Backup Export / Import
  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ tasks, habits }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `flow_tracker_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.tasks && parsed.habits) {
          setTasks(parsed.tasks);
          setHabits(parsed.habits);
        }
      } catch (err) {
        console.error('Invalid backup JSON', err);
      }
    };
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0]);
    }
  };

  const selectedTask = activeTasks.find((t) => t.id === selectedTaskId);
  const todayStatus = selectedTask ? selectedTask.matrix[currentDay] : 0;
  const totalStreamHeight = CANVAS_PAD_Y + TIMELINE_DAYS.length * ROW_HEIGHT + 120;
  const currentDayInfo = TIMELINE_DAYS[currentDay];
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
          {/* FOCUS CURRENT WEEK */}
          <button
            onClick={() => centerCurrentWeek(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            title="Recenter view to current week"
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
            >
              <Rewind size={12} />
            </button>
            <span className="text-[10px] font-bold px-1 text-white">{currentDayInfo.dateStr}</span>
            <button 
              onClick={() => handleShiftDay(1)} 
              className="p-1 hover:bg-white/10 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
            >
              <FastForward size={12} />
            </button>
          </div>

          {/* BACKUP & RESTORE */}
          <div className="flex items-center gap-1 border-l border-white/10 pl-3">
            <button
              onClick={handleExportBackup}
              className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Export Snapshot (JSON)"
            >
              <Download size={14} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportBackup} 
              accept=".json" 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Import Snapshot (JSON)"
            >
              <Upload size={14} />
            </button>
            <button
              onClick={() => setVaultOpen(true)}
              className="relative p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Open Vault (Archived Tasks)"
            >
              <Archive size={14} />
              {archivedTasks.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
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

          {/* Active Task Column Headers */}
          <div className="flex-1 relative overflow-hidden min-w-max">
            {activeTasks.map((task, idx) => (
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
          {/* Merged Continuous Habit Rails */}
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
              tasks={activeTasks} 
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
              onClick={() => handleArchiveTask(selectedTask.id)}
              className="flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
              title="Archive column (Safely stores data into Vault)"
            >
              <Archive size={12} />
              <span>Archive Task</span>
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
      {/* FLOATING CARD MODAL: CREATE TASK (Free Color Wheel) */}
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
                  placeholder="e.g. Mechanical Rig..."
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                />
              </div>

              {/* NATIVE COLOR CIRCLE PICKER */}
              <div>
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">Fluid Color (Free Wheel)</label>
                <div className="flex items-center gap-3 bg-[#141414] p-2 rounded-lg border border-white/10">
                  <input
                    type="color"
                    value={taskForm.hex}
                    onChange={(e) => setTaskForm({ ...taskForm, hex: e.target.value })}
                    className="w-9 h-9 rounded-full cursor-pointer bg-transparent border-none outline-none"
                  />
                  <span className="text-xs font-mono uppercase text-white font-bold">{taskForm.hex}</span>
                </div>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
                  Position Slot (1 to {activeTasks.length + 1})
                </label>
                <input
                  type="number"
                  min={1}
                  max={activeTasks.length + 1}
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
      {/* FLOATING CARD MODAL: CREATE HABIT (Free Color Wheel) */}
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
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">Track Color (Free Wheel)</label>
                <div className="flex items-center gap-3 bg-[#141414] p-2 rounded-lg border border-white/10">
                  <input
                    type="color"
                    value={habitForm.hex}
                    onChange={(e) => setHabitForm({ ...habitForm, hex: e.target.value })}
                    className="w-9 h-9 rounded-full cursor-pointer bg-transparent border-none outline-none"
                  />
                  <span className="text-xs font-mono uppercase text-white font-bold">{habitForm.hex}</span>
                </div>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
                  Position Slot (1 to {habits.length + 1})
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

      {/* ========================================================= */}
      {/* THE VAULT DRAWER (Soft-Deleted Tasks & Name History) */}
      {/* ========================================================= */}
      {vaultOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-[#0a0a0a] border-l border-white/10 h-full p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Archive size={16} className="text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-white">Task Archive Vault</span>
                </div>
                <button onClick={() => setVaultOpen(false)} className="text-neutral-500 hover:text-white transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-180px)] pr-2">
                {archivedTasks.length === 0 ? (
                  <div className="text-center py-12 text-neutral-600 text-xs tracking-wider uppercase font-bold">
                    No archived tasks in the vault.
                  </div>
                ) : (
                  archivedTasks.map((t) => {
                    const loggedDays = t.matrix.filter((v) => v > 0).length;

                    return (
                      <div key={t.id} className="bg-[#121212] border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.hex }} />
                            <span className="text-xs font-black text-white uppercase">{t.title}</span>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-bold">{loggedDays} Days Total</span>
                        </div>

                        {/* Audit Log / Name History */}
                        {t.nameHistory && t.nameHistory.length > 1 && (
                          <div className="bg-black/40 p-2 rounded text-[9px] text-neutral-400 flex flex-col gap-1">
                            <span className="font-bold text-neutral-500 flex items-center gap-1">
                              <History size={10} /> Name History:
                            </span>
                            {t.nameHistory.map((h, i) => (
                              <span key={i} className="pl-3 border-l border-white/10">
                                • {h.title} <span className="text-neutral-600">({h.at})</span>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <button
                            onClick={() => handleRestoreTask(t.id)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded bg-white text-black hover:bg-neutral-200 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            <RefreshCw size={11} />
                            <span>Respawn</span>
                          </button>

                          {purgeConfirmId === t.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Type DELETE"
                                autoFocus
                                value={purgeInputText}
                                onChange={(e) => setPurgeInputText(e.target.value)}
                                className="w-24 bg-black border border-red-500/50 rounded px-1.5 py-0.5 text-[9px] text-red-300 outline-none uppercase"
                              />
                              <button
                                onClick={() => handleHardPurgeTask(t.id)}
                                disabled={purgeInputText !== 'DELETE'}
                                className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors ${
                                  purgeInputText === 'DELETE' ? 'bg-red-600 text-white cursor-pointer' : 'bg-red-950/40 text-red-500/40 cursor-default'
                                }`}
                              >
                                Purge
                              </button>
                              <button onClick={() => setPurgeConfirmId(null)} className="text-neutral-500 hover:text-white text-xs">
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setPurgeConfirmId(t.id);
                                setPurgeInputText('');
                              }}
                              className="text-red-400 hover:text-red-300 text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
                            >
                              Hard Erase
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-[9px] text-neutral-500 leading-relaxed">
              Archived tasks retain all historical days, streaks, and umbilical connections. They are safely removed from the active canvas without altering coordinates.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}