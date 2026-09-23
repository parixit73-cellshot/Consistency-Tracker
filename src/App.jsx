import React, { useState, useRef, useEffect } from 'react';
import {
  ROW_HEIGHT,
  CANVAS_PAD_Y,
  BASE_CURRENT_DAY_INDEX,
  TIMELINE_DAYS,
  loadPersistedTasks,
  loadPersistedHabits,
  loadPersistedRevisions,
  persistState,
  executeMatrixAction,
  shiftCurrentDay,
  toggleHabitToday,
  renameTask,
  updateTaskColor,
  insertNewTask,
  insertNewHabit,
} from './trackerStore';

import { Header, FooterControls } from './components/Header';
import { TimelineStream } from './components/TimelineStream';
import { TaskModal, HabitModal, NameHistoryModal } from './components/Modals';
import { ImportInspectorModal, RevisionsModal, VaultDrawer } from './components/BackupVaultModals';

export default function App() {
  const [tasks, setTasks] = useState(loadPersistedTasks);
  const [habits, setHabits] = useState(loadPersistedHabits);
  const [revisions, setRevisions] = useState(loadPersistedRevisions);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [currentDay, setCurrentDay] = useState(BASE_CURRENT_DAY_INDEX);

  // Modals & Panels State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', hex: '#34d399', position: 1 });

  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [habitForm, setHabitForm] = useState({ label: '', hex: '#22d3ee', position: 1 });

  const [vaultOpen, setVaultOpen] = useState(false);
  const [historyModalTask, setHistoryModalTask] = useState(null);
  const [revisionsModalOpen, setRevisionsModalOpen] = useState(false);

  // Selective Import State
  const [importFilePayload, setImportFilePayload] = useState(null);
  const [selectedImportTaskIds, setSelectedImportTaskIds] = useState(new Set());

  // Hard Purge State
  const [purgeConfirmId, setPurgeConfirmId] = useState(null);
  const [purgeInputText, setPurgeInputText] = useState('');

  // Inline Editing
  const [editingItemId, setEditingItemId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const snapshotState = (reason = 'Manual Change') => {
    const snap = {
      id: `rev-${Date.now()}`,
      at: new Date().toLocaleTimeString(),
      reason,
      tasks: JSON.parse(JSON.stringify(tasks)),
      habits: JSON.parse(JSON.stringify(habits)),
    };
    setRevisions((prev) => [snap, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    persistState(tasks, habits, revisions);
  }, [tasks, habits, revisions]);

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

  const activeTasks = tasks.filter((t) => !t.isArchived);
  const archivedTasks = tasks.filter((t) => t.isArchived);

  // --- ACTIONS ---
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    snapshotState(`Spawn Task: ${taskForm.title}`);
    setTasks((prev) =>
      insertNewTask(
        prev,
        { title: taskForm.title, hex: taskForm.hex, position: parseInt(taskForm.position, 10) },
        TIMELINE_DAYS.length
      )
    );
    setTaskModalOpen(false);
  };

  const handleCreateHabit = (e) => {
    e.preventDefault();
    if (!habitForm.label.trim()) return;
    snapshotState(`Spawn Habit: ${habitForm.label}`);
    setHabits((prev) =>
      insertNewHabit(
        prev,
        { label: habitForm.label, hex: habitForm.hex, position: parseInt(habitForm.position, 10) },
        TIMELINE_DAYS.length
      )
    );
    setHabitModalOpen(false);
  };

  const handleArchiveTask = (taskId) => {
    snapshotState('Archive Task');
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isArchived: true } : t)));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
  };

  const handleRestoreTask = (taskId) => {
    snapshotState('Respawn Task from Vault');
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isArchived: false } : t)));
  };

  const handleHardPurgeTask = (taskId) => {
    if (purgeInputText.trim().toUpperCase() !== 'DELETE') return;
    snapshotState('Purge Task Permanently');
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setPurgeConfirmId(null);
    setPurgeInputText('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          setImportFilePayload(parsed);
          setSelectedImportTaskIds(new Set(parsed.tasks.map((t) => t.id)));
        }
      } catch (err) {
        console.error('Invalid backup JSON', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteSelectiveImport = (destination = 'active') => {
    if (!importFilePayload) return;
    snapshotState(`Selective Track Import (${destination})`);

    const tasksToBringIn = importFilePayload.tasks
      .filter((t) => selectedImportTaskIds.has(t.id))
      .map((t) => ({
        ...t,
        id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        isArchived: destination === 'vault',
      }));

    setTasks((prev) => [...prev, ...tasksToBringIn]);
    setImportFilePayload(null);
  };

  const selectedTask = activeTasks.find((t) => t.id === selectedTaskId);
  const todayStatus = selectedTask ? selectedTask.matrix[currentDay] : 0;
  const currentDayInfo = TIMELINE_DAYS[currentDay];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070707] text-white font-mono select-none overflow-hidden relative">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />

      {/* TOP HEADER */}
      <Header
        currentDayInfo={currentDayInfo}
        onCenterWeek={() => centerCurrentWeek(true)}
        onShiftDay={(delta) => {
          const nextDay = Math.min(Math.max(0, currentDay + delta), TIMELINE_DAYS.length - 1);
          if (nextDay !== currentDay) {
            setTasks((prev) => shiftCurrentDay(prev, currentDay, nextDay));
            setCurrentDay(nextDay);
          }
        }}
        onExportBackup={() => {
          const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ tasks, habits }));
          const a = document.createElement('a');
          a.setAttribute('href', dataStr);
          a.setAttribute('download', `flow_tracker_backup_${Date.now()}.json`);
          document.body.appendChild(a);
          a.click();
          a.remove();
        }}
        onTriggerFileInput={() => fileInputRef.current?.click()}
        onOpenRevisions={() => setRevisionsModalOpen(true)}
        onOpenVault={() => setVaultOpen(true)}
        archivedCount={archivedTasks.length}
        onOpenTaskModal={() => {
          setTaskForm({ title: '', hex: '#34d399', position: activeTasks.length + 1 });
          setTaskModalOpen(true);
        }}
      />

      {/* TIMELINE STREAM */}
      <TimelineStream
        scrollRef={scrollContainerRef}
        tasks={activeTasks}
        habits={habits}
        currentDay={currentDay}
        selectedTaskId={selectedTaskId}
        onSelectTask={setSelectedTaskId}
        onHabitClick={(habitId, dayIndex) => setHabits((prev) => toggleHabitToday(prev, habitId, dayIndex, currentDay))}
        onDeleteHabit={(e, habitId) => {
          e.stopPropagation();
          snapshotState('Delete Habit');
          setHabits((prev) => prev.filter((h) => h.id !== habitId));
        }}
        onOpenHabitModal={() => {
          setHabitForm({ label: '', hex: '#22d3ee', position: habits.length + 1 });
          setHabitModalOpen(true);
        }}
        onColorChange={(taskId, hex) => setTasks((prev) => updateTaskColor(prev, taskId, hex))}
        editingItemId={editingItemId}
        editValue={editValue}
        setEditValue={setEditValue}
        onStartRename={(id, title) => {
          setEditingItemId(id);
          setEditValue(title);
        }}
        onSaveRename={(type, id) => {
          if (type === 'task') setTasks((prev) => renameTask(prev, id, editValue));
          else setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, label: (editValue.trim() || h.label).substring(0, 5).toUpperCase() } : h)));
          setEditingItemId(null);
        }}
        onOpenHistory={setHistoryModalTask}
      />

      {/* FOOTER CONTROLS */}
      <FooterControls
        selectedTask={selectedTask}
        todayStatus={todayStatus}
        onColorChange={(taskId, hex) => setTasks((prev) => updateTaskColor(prev, taskId, hex))}
        onArchiveTask={handleArchiveTask}
        onAction={(action) => {
          if (!selectedTaskId) return;
          setTasks((prev) => executeMatrixAction(prev, selectedTaskId, action, currentDay));
        }}
      />

      {/* MODALS & DRAWERS */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleCreateTask}
        form={taskForm}
        setForm={setTaskForm}
        maxPosition={activeTasks.length + 1}
      />

      <HabitModal
        isOpen={habitModalOpen}
        onClose={() => setHabitModalOpen(false)}
        onSubmit={handleCreateHabit}
        form={habitForm}
        setForm={setHabitForm}
        maxPosition={habits.length + 1}
      />

      <NameHistoryModal task={historyModalTask} onClose={() => setHistoryModalTask(null)} />

      <ImportInspectorModal
        payload={importFilePayload}
        selectedIds={selectedImportTaskIds}
        onToggleSelection={(taskId) => {
          setSelectedImportTaskIds((prev) => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
          });
        }}
        onExecuteImport={handleExecuteSelectiveImport}
        onClose={() => setImportFilePayload(null)}
      />

      <RevisionsModal
        isOpen={revisionsModalOpen}
        onClose={() => setRevisionsModalOpen(false)}
        revisions={revisions}
        onRollback={(rev) => {
          snapshotState('Rollback to Snapshot');
          setTasks(rev.tasks);
          setHabits(rev.habits);
          setRevisionsModalOpen(false);
        }}
      />

      <VaultDrawer
        isOpen={vaultOpen}
        onClose={() => setVaultOpen(false)}
        archivedTasks={archivedTasks}
        onRestoreTask={handleRestoreTask}
        purgeConfirmId={purgeConfirmId}
        setPurgeConfirmId={setPurgeConfirmId}
        purgeInputText={purgeInputText}
        setPurgeInputText={setPurgeInputText}
        onHardPurgeTask={handleHardPurgeTask}
      />
    </div>
  );
}