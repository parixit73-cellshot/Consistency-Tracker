import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ROW_HEIGHT,
  CANVAS_PAD_Y,
  formatISODate,
  generateTimelineDays,
  generateSafeId,
  sanitizeTask,
  sanitizeHabit,
  loadPersistedTasks,
  loadPersistedHabits,
  loadPersistedRevisions,
  persistState,
  executeMatrixAction,
  toggleHabitToday,
  renameTask,
  renameHabit,
  updateTaskColor,
  moveTaskPosition,
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

  // Sync to real laptop time
  const [now, setNow] = useState(() => new Date());
  const todayIso = useMemo(() => formatISODate(now), [now]);

  // Generate dynamic calendar slice: 21 days back, 7 days forward
  // Adaptively spans as many months back as required (minimum 90 days)
  const timelineDays = useMemo(() => generateTimelineDays(now, tasks, habits), [now, tasks, habits]);

  // Today's day index in the current slice
  const todayIndex = useMemo(() => {
    const idx = timelineDays.findIndex((d) => d.isoDate === todayIso);
    return idx !== -1 ? idx : 21;
  }, [timelineDays, todayIso]);

  // Refresh clock every minute to detect midnight turnover automatically
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', hex: '#34d399', position: 1 });

  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [habitForm, setHabitForm] = useState({ label: '', hex: '#22d3ee', position: 1 });

  const [vaultOpen, setVaultOpen] = useState(false);
  const [historyModalTask, setHistoryModalTask] = useState(null);
  const [revisionsModalOpen, setRevisionsModalOpen] = useState(false);

  const [importFilePayload, setImportFilePayload] = useState(null);
  const [selectedImportTaskIds, setSelectedImportTaskIds] = useState(new Set());

  const [purgeConfirmId, setPurgeConfirmId] = useState(null);
  const [purgeInputText, setPurgeInputText] = useState('');

  const [editingItemId, setEditingItemId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const snapshotState = (reason = 'Manual Change') => {
    const snap = {
      id: generateSafeId('rev'),
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
    const targetScroll = CANVAS_PAD_Y + Math.max(0, todayIndex - 3) * ROW_HEIGHT - 12;
    scrollContainerRef.current.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    centerCurrentWeek(false);
  }, [todayIndex]);

  const activeTasks = tasks.filter((t) => !t.isArchived);
  const archivedTasks = tasks.filter((t) => t.isArchived);

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    snapshotState(`Spawn Task: ${taskForm.title}`);
    setTasks((prev) =>
      insertNewTask(prev, { title: taskForm.title, hex: taskForm.hex, position: parseInt(taskForm.position, 10) })
    );
    setTaskModalOpen(false);
  };

  const handleCreateHabit = (e) => {
    e.preventDefault();
    if (!habitForm.label.trim()) return;
    snapshotState(`Spawn Habit: ${habitForm.label}`);
    setHabits((prev) =>
      insertNewHabit(prev, { label: habitForm.label, hex: habitForm.hex, position: parseInt(habitForm.position, 10) })
    );
    setHabitModalOpen(false);
  };

  const handleArchiveTask = useCallback((taskId) => {
    snapshotState('Archive Task');
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isArchived: true } : t)));
    setSelectedTaskId((prev) => (prev === taskId ? null : prev));
  }, [tasks]);

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
          const cleanTasks = parsed.tasks.map(sanitizeTask);
          setImportFilePayload({ ...parsed, tasks: cleanTasks });
          setSelectedImportTaskIds(new Set(cleanTasks.map((t) => t.id)));
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
        id: generateSafeId('imp'),
        isArchived: destination === 'vault',
      }));

    setTasks((prev) => [...prev, ...tasksToBringIn]);
    setImportFilePayload(null);
  };

  const selectedTask = activeTasks.find((t) => t.id === selectedTaskId);
  const todayStatus = selectedTask ? (selectedTask.matrix?.[todayIso] || 0) : 0;
  const currentDayInfo = timelineDays[todayIndex] || {
    weekNum: 39,
    dayName: 'TODAY',
    dateStr: todayIso,
    isSunday: false,
  };

  // Keyboard Shortcuts (Enter = Start/Stop, Del = Archive, Ctrl+Z = Undo)
  useEffect(() => {
    function handleKeyDown(e) {
      const tagName = document.activeElement?.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;

      if (!selectedTaskId) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setTasks((prev) => executeMatrixAction(prev, selectedTaskId, 'UNDO', todayIso));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (todayStatus === 2) {
          setTasks((prev) => executeMatrixAction(prev, selectedTaskId, 'STOP', todayIso));
        } else if (todayStatus === 0) {
          setTasks((prev) => executeMatrixAction(prev, selectedTaskId, 'START', todayIso));
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleArchiveTask(selectedTaskId);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskId, todayStatus, todayIso, handleArchiveTask]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070707] text-white font-mono select-none overflow-hidden relative">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />

      {/* TOP HEADER */}
      <Header
        currentDayInfo={currentDayInfo}
        onCenterWeek={() => centerCurrentWeek(true)}
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
        timelineDays={timelineDays}
        todayIso={todayIso}
        tasks={activeTasks}
        habits={habits}
        selectedTaskId={selectedTaskId}
        onSelectTask={setSelectedTaskId}
        onMoveTask={(taskId, direction) => {
          snapshotState(`Reorder Task: ${direction}`);
          setTasks((prev) => moveTaskPosition(prev, taskId, direction));
        }}
        onHabitClick={(habitId, targetIso) => setHabits((prev) => toggleHabitToday(prev, habitId, targetIso))}
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
          setEditingItemId(null);
        }}
        onRenameHabit={(id, newLabel) => setTasks((prev) => {
          setHabits((prevH) => renameHabit(prevH, id, newLabel));
          return prev;
        })}
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
          setTasks((prev) => executeMatrixAction(prev, selectedTaskId, action, todayIso));
        }}
      />

      {/* MODALS */}
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
          setTasks(rev.tasks.map(sanitizeTask));
          setHabits(rev.habits.map(sanitizeHabit));
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