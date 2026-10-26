import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Play,
  Square,
  RotateCcw,
  LocateFixed,
  Archive,
  Download,
  Upload,
  Palette,
  Layers,
  Trash2,
  Edit2,
  Check,
  History,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  RefreshCw,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  FileText,
  Send,
  Calendar,
  Clock,
  GripVertical,
} from 'lucide-react';

// ============================================================================
// LAYER 1: PURE DOMAIN MODEL, STRICT VALIDATION & TIME ENGINE
// (Zero silent fallbacks: corrupt payloads throw explicit errors)
// ============================================================================

const BASE_ROW_HEIGHT = 64;
const BASE_COL_WIDTH = 120;
const BASE_COL_GAP = 32;
const BASE_PILL_WIDTH = 36;
const BASE_CANVAS_PAD_X = 36;
const BASE_CANVAS_PAD_Y = 24;
const DATE_COL_WIDTH = 104;

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const STORAGE_TASKS_KEY = 'flow_tracker_tasks_prod';
const STORAGE_HABITS_KEY = 'flow_tracker_habits_prod';
const STORAGE_REVISIONS_KEY = 'flow_tracker_revisions_prod';

export function formatISODate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object passed to formatISODate');
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODateLocal(isoStr) {
  if (typeof isoStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) {
    throw new Error(`Invalid ISO date string: "${isoStr}"`);
  }
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

export function generateSafeId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Strict Validator & Sanitizer — Fails loudly on corrupt objects
export function validateAndNormalizeTask(t) {
  if (!t || typeof t !== 'object') {
    throw new Error('Corrupt Task Record: Expected an object.');
  }
  if (typeof t.id !== 'string' || !t.id.trim()) {
    throw new Error(`Corrupt Task Record: Missing mandatory string "id" on task "${t.title || 'unknown'}".`);
  }
  if (typeof t.title !== 'string' || !t.title.trim()) {
    throw new Error(`Corrupt Task Record: Missing mandatory "title" on task id "${t.id}".`);
  }
  if (t.matrix !== undefined && (typeof t.matrix !== 'object' || Array.isArray(t.matrix) || t.matrix === null)) {
    throw new Error(`Corrupt Task Record: "matrix" for task "${t.title}" must be a date-keyed object map.`);
  }

  return {
    id: t.id,
    title: t.title.trim().substring(0, 16),
    hex: typeof t.hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(t.hex) ? t.hex : '#34d399',
    isArchived: Boolean(t.isArchived),
    nameHistory: Array.isArray(t.nameHistory)
      ? t.nameHistory
      : [{ title: t.title.trim(), at: formatISODate(new Date()) }],
    matrix: t.matrix ? { ...t.matrix } : {},
    notes: t.notes && typeof t.notes === 'object' && !Array.isArray(t.notes) ? { ...t.notes } : {},
  };
}

export function validateAndNormalizeHabit(h) {
  if (!h || typeof h !== 'object') {
    throw new Error('Corrupt Habit Record: Expected an object.');
  }
  if (typeof h.id !== 'string' || !h.id.trim()) {
    throw new Error(`Corrupt Habit Record: Missing mandatory string "id" on habit "${h.label || 'unknown'}".`);
  }
  if (typeof h.label !== 'string' || !h.label.trim()) {
    throw new Error(`Corrupt Habit Record: Missing mandatory "label" on habit id "${h.id}".`);
  }
  if (h.data !== undefined && (typeof h.data !== 'object' || Array.isArray(h.data) || h.data === null)) {
    throw new Error(`Corrupt Habit Record: "data" for habit "${h.label}" must be a date-keyed object map.`);
  }

  return {
    id: h.id,
    label: h.label.trim().substring(0, 16).toUpperCase(),
    hex: typeof h.hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(h.hex) ? h.hex : '#22d3ee',
    nameHistory: Array.isArray(h.nameHistory)
      ? h.nameHistory
      : [{ title: h.label.trim().toUpperCase(), at: formatISODate(new Date()) }],
    data: h.data ? { ...h.data } : {},
  };
}

export function loadPersistedTasks() {
  const saved = localStorage.getItem(STORAGE_TASKS_KEY);
  if (!saved) return [];
  const parsed = JSON.parse(saved);
  if (!Array.isArray(parsed)) {
    throw new Error('Storage corruption: flow_tracker_tasks_prod is not an array.');
  }
  return parsed.map(validateAndNormalizeTask);
}

export function loadPersistedHabits() {
  const saved = localStorage.getItem(STORAGE_HABITS_KEY);
  if (!saved) return [];
  const parsed = JSON.parse(saved);
  if (!Array.isArray(parsed)) {
    throw new Error('Storage corruption: flow_tracker_habits_prod is not an array.');
  }
  return parsed.map(validateAndNormalizeHabit);
}

export function loadPersistedRevisions() {
  const saved = localStorage.getItem(STORAGE_REVISIONS_KEY);
  if (!saved) return [];
  const parsed = JSON.parse(saved);
  if (!Array.isArray(parsed)) {
    throw new Error('Storage corruption: flow_tracker_revisions_prod is not an array.');
  }
  return parsed;
}

export function persistState(tasks, habits, revisions = []) {
  localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
  localStorage.setItem(STORAGE_HABITS_KEY, JSON.stringify(habits));
  if (revisions.length > 0) {
    localStorage.setItem(STORAGE_REVISIONS_KEY, JSON.stringify(revisions.slice(0, 20)));
  }
}

export function generateTimelineDays(centerDate = new Date(), tasks = [], habits = []) {
  let earliestTime = new Date(centerDate).getTime() - 90 * 86400000;

  const scanDates = (dateMap) => {
    if (!dateMap || typeof dateMap !== 'object') return;
    Object.keys(dateMap).forEach((iso) => {
      const t = parseISODateLocal(iso).getTime();
      if (t < earliestTime) {
        earliestTime = t;
      }
    });
  };

  tasks.forEach((t) => scanDates(t.matrix));
  habits.forEach((h) => scanDates(h.data));

  const startDate = new Date(earliestTime);
  startDate.setDate(startDate.getDate() - startDate.getDay() - 7);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(centerDate);
  endDate.setDate(endDate.getDate() + 14);
  endDate.setHours(0, 0, 0, 0);

  const days = [];
  const cur = new Date(startDate);
  let idx = 0;

  while (cur <= endDate) {
    const iso = formatISODate(cur);
    const dayName = DAY_NAMES[cur.getDay()];
    const dateStr = `${String(cur.getDate()).padStart(2, '0')}/${String(cur.getMonth() + 1).padStart(2, '0')}`;
    const weekNum = getWeekNumber(cur);
    const isSunday = cur.getDay() === 0;

    days.push({
      dayIndex: idx++,
      isoDate: iso,
      dayName,
      dateStr,
      weekNum,
      isSunday,
    });

    cur.setDate(cur.getDate() + 1);
  }

  return days;
}

// ============================================================================
// LAYER 2: PURE GEOMETRY & STREAK ENGINE
// (Accepts state + zoom + rail widths -> Outputs exact pixel bounding boxes)
// ============================================================================

export function getCalendarWeekDiff(isoA, isoB) {
  const lastActiveDate = parseISODateLocal(isoA);
  const nextActiveDate = parseISODateLocal(isoB);

  const lastSunday = new Date(lastActiveDate);
  lastSunday.setDate(lastActiveDate.getDate() - lastActiveDate.getDay());
  lastSunday.setHours(0, 0, 0, 0);

  const nextSunday = new Date(nextActiveDate);
  nextSunday.setDate(nextActiveDate.getDate() - nextActiveDate.getDay());
  nextSunday.setHours(0, 0, 0, 0);

  return Math.round((nextSunday.getTime() - lastSunday.getTime()) / (7 * 86400000));
}

export function parseTaskSprintsAndStreak(task, timelineDays, todayIso) {
  const blocks = [];
  let blockStart = null;
  let blockDays = [];
  let hasActive = false;

  for (let i = 0; i < timelineDays.length; i++) {
    const d = timelineDays[i];
    const val = task.matrix?.[d.isoDate] || 0;

    if (val > 0) {
      if (blockStart === null) blockStart = i;
      blockDays.push(d);
      if (val === 2) hasActive = true;
    } else {
      if (blockStart !== null) {
        const first = blockDays[0];
        const last = blockDays[blockDays.length - 1];
        blocks.push({
          key: `${first.isoDate}_${last.isoDate}`,
          startIdx: blockStart,
          daysCount: blockDays.length,
          startIso: first.isoDate,
          endIso: last.isoDate,
          firstDayName: first.dayName,
          lastDayName: last.dayName,
          startDateStr: first.dateStr,
          endDateStr: last.dateStr,
          isActive: hasActive,
        });
        blockStart = null;
        blockDays = [];
        hasActive = false;
      }
    }
  }

  if (blockStart !== null) {
    const first = blockDays[0];
    const last = blockDays[blockDays.length - 1];
    blocks.push({
      key: `${first.isoDate}_${last.isoDate}`,
      startIdx: blockStart,
      daysCount: blockDays.length,
      startIso: first.isoDate,
      endIso: last.isoDate,
      firstDayName: first.dayName,
      lastDayName: last.dayName,
      startDateStr: first.dateStr,
      endDateStr: last.dateStr,
      isActive: hasActive,
    });
  }

  const cords = [];
  for (let b = 0; b < blocks.length - 1; b++) {
    const prevBlock = blocks[b];
    const nextBlock = blocks[b + 1];
    const weekDiff = getCalendarWeekDiff(prevBlock.endIso, nextBlock.startIso);

    if (weekDiff <= 1) {
      cords.push({
        startBlockIdx: b,
        endBlockIdx: b + 1,
        startDayIdx: prevBlock.startIdx + prevBlock.daysCount - 1,
        endDayIdx: nextBlock.startIdx,
      });
    }
  }

  // Calculate active streak connected up to current/previous calendar week
  let currentStreak = 0;
  if (blocks.length > 0) {
    const lastBlock = blocks[blocks.length - 1];
    const weekDiffToToday = getCalendarWeekDiff(lastBlock.endIso, todayIso);
    if (weekDiffToToday <= 1) {
      currentStreak = lastBlock.daysCount;
      for (let b = blocks.length - 2; b >= 0; b--) {
        const prev = blocks[b];
        const next = blocks[b + 1];
        if (getCalendarWeekDiff(prev.endIso, next.startIso) <= 1) {
          currentStreak += prev.daysCount;
        } else {
          break;
        }
      }
    }
  }

  return { blocks, cords, currentStreak };
}

export function parseHabitBlocks(habitData, timelineDays) {
  const blocks = [];
  let start = null;
  let len = 0;

  for (let i = 0; i < timelineDays.length; i++) {
    const iso = timelineDays[i].isoDate;
    const isCompleted = habitData?.[iso] === 1;

    if (isCompleted) {
      if (start === null) start = i;
      len++;
    } else {
      if (start !== null) {
        blocks.push({ startIdx: start, daysCount: len });
        start = null;
        len = 0;
      }
    }
  }
  if (start !== null) {
    blocks.push({ startIdx: start, daysCount: len });
  }
  return blocks;
}

export function computeBoardGeometry({
  activeTasks,
  habits,
  timelineDays,
  todayIso,
  zoom,
}) {
  const rowHeight = Math.round(BASE_ROW_HEIGHT * zoom);
  const colWidth = Math.round(BASE_COL_WIDTH * zoom);
  const colGap = Math.round(BASE_COL_GAP * zoom);
  const canvasPadX = Math.round(BASE_CANVAS_PAD_X * zoom);
  const canvasPadY = Math.round(BASE_CANVAS_PAD_Y * zoom);

  // Strict vertical capsule width (32px to 40px) centered in lane
  const pillWidth = Math.max(32, Math.min(40, Math.round(BASE_PILL_WIDTH * zoom)));
  const habitStep = Math.max(30, Math.round(36 * zoom));

  const totalStreamHeight = canvasPadY * 2 + timelineDays.length * rowHeight + 120;
  const taskCanvasWidth = Math.max(
    900,
    canvasPadX * 2 + activeTasks.length * (colWidth + colGap) + 120
  );

  // Pre-compute row Y & center Y coordinates
  const rows = timelineDays.map((d, idx) => {
    const top = canvasPadY + idx * rowHeight;
    const centerY = top + rowHeight / 2;
    return {
      ...d,
      top,
      height: rowHeight,
      centerY,
    };
  });

  // Pre-compute habit lanes
  const habitLanes = habits.map((h, idx) => {
    const centerX = 24 + idx * habitStep;
    const rawBlocks = parseHabitBlocks(h.data, timelineDays);
    const pillSegments = rawBlocks.map((b) => {
      const firstRow = rows[b.startIdx];
      const lastRow = rows[b.startIdx + b.daysCount - 1];
      const pad = Math.max(8, Math.round(11 * zoom));
      const top = firstRow.top + pad;
      const bottom = lastRow.top + rowHeight - pad;
      return {
        top,
        height: Math.max(10, bottom - top),
      };
    });

    return {
      habit: h,
      idx,
      centerX,
      pillSegments,
    };
  });

  // Pre-compute task columns, centered vertical capsules, and SVG center-line cords
  const taskColumns = [];
  const allSvgCords = [];

  activeTasks.forEach((task, idx) => {
    const left = canvasPadX + idx * (colWidth + colGap);
    const centerX = left + colWidth / 2;
    const pillLeft = centerX - pillWidth / 2;

    const { blocks, cords, currentStreak } = parseTaskSprintsAndStreak(
      task,
      timelineDays,
      todayIso
    );

    const positionedBlocks = blocks.map((blk) => {
      const firstRow = rows[blk.startIdx];
      const lastRow = rows[blk.startIdx + blk.daysCount - 1];
      const vInset = Math.max(4, Math.round(5 * zoom));
      const top = firstRow.top + vInset;
      const bottom = lastRow.top + rowHeight - vInset;
      const height = Math.max(pillWidth, bottom - top);
      const hasNotes =
        (task.notes?.[blk.key]?.logs?.length || 0) > 0 ||
        Boolean(task.notes?.[blk.key]?.pending?.trim());

      return {
        ...blk,
        left: pillLeft,
        top,
        width: pillWidth,
        height,
        centerX,
        firstCenterY: firstRow.centerY,
        lastCenterY: lastRow.centerY,
        hasNotes,
      };
    });

    cords.forEach((c) => {
      const fromBlk = positionedBlocks[c.startBlockIdx];
      const toBlk = positionedBlocks[c.endBlockIdx];
      allSvgCords.push({
        id: `${task.id}-${c.startBlockIdx}-${c.endBlockIdx}`,
        taskId: task.id,
        hex: task.hex,
        x: centerX,
        y1: fromBlk.lastCenterY,
        y2: toBlk.firstCenterY,
      });
    });

    taskColumns.push({
      task,
      idx,
      left,
      width: colWidth,
      centerX,
      pillWidth,
      blocks: positionedBlocks,
      currentStreak,
      totalDays: Object.values(task.matrix || {}).filter((v) => v > 0).length,
    });
  });

  return {
    rowHeight,
    colWidth,
    colGap,
    pillWidth,
    canvasPadX,
    canvasPadY,
    habitStep,
    totalStreamHeight,
    taskCanvasWidth,
    rows,
    habitLanes,
    taskColumns,
    allSvgCords,
  };
}

// ============================================================================
// PURE STATE MUTATION HELPERS
// ============================================================================

function executeMatrixAction(tasks, taskId, action, targetIso) {
  return tasks.map((task) => {
    if (task.id !== taskId) return task;
    const nextMatrix = { ...(task.matrix || {}) };
    const currentVal = nextMatrix[targetIso] || 0;

    if (action === 'START') {
      if (currentVal === 0) nextMatrix[targetIso] = 2;
    } else if (action === 'STOP') {
      if (currentVal === 2) nextMatrix[targetIso] = 1;
    } else if (action === 'UNDO') {
      delete nextMatrix[targetIso];
    } else if (action === 'TOGGLE_PAST') {
      if (currentVal > 0) {
        delete nextMatrix[targetIso];
      } else {
        nextMatrix[targetIso] = 1;
      }
    }

    return { ...task, matrix: nextMatrix };
  });
}

function toggleHabitDate(habits, habitId, targetIso) {
  return habits.map((h) => {
    if (h.id !== habitId) return h;
    const nextData = { ...(h.data || {}) };
    if (nextData[targetIso] === 1) {
      delete nextData[targetIso];
    } else {
      nextData[targetIso] = 1;
    }
    return { ...h, data: nextData };
  });
}

function renameTaskRecord(tasks, taskId, newTitle) {
  const trimmed = newTitle.trim().substring(0, 16);
  if (!trimmed) return tasks;
  return tasks.map((t) => {
    if (t.id !== taskId || t.title === trimmed) return t;
    const history = Array.isArray(t.nameHistory) ? t.nameHistory : [];
    return {
      ...t,
      title: trimmed,
      nameHistory: [...history, { title: trimmed, at: formatISODate(new Date()) }],
    };
  });
}

function renameHabitRecord(habits, habitId, newLabel, newHex) {
  const trimmed = newLabel.trim().substring(0, 16).toUpperCase();
  if (!trimmed) return habits;
  return habits.map((h) => {
    if (h.id !== habitId) return h;
    const history = Array.isArray(h.nameHistory) ? h.nameHistory : [];
    const nextHistory =
      h.label !== trimmed
        ? [...history, { title: trimmed, at: formatISODate(new Date()) }]
        : history;
    return {
      ...h,
      label: trimmed,
      hex: newHex || h.hex,
      nameHistory: nextHistory,
    };
  });
}

function insertNewTaskRecord(tasks, { title, hex, position }) {
  const cleanTitle = title.trim().substring(0, 16);
  if (!cleanTitle) {
    throw new Error('Cannot create a task without a valid title.');
  }
  const newTask = {
    id: generateSafeId('col'),
    title: cleanTitle,
    hex: hex || '#34d399',
    isArchived: false,
    nameHistory: [{ title: cleanTitle, at: formatISODate(new Date()) }],
    matrix: {},
    notes: {},
  };

  const parsedPos = parseInt(position, 10);
  const pos = Number.isFinite(parsedPos) ? parsedPos : 1;
  const activeOnly = tasks.filter((t) => !t.isArchived);
  const targetActiveIndex = Math.max(0, Math.min(pos - 1, activeOnly.length));

  if (targetActiveIndex >= activeOnly.length) {
    return [...tasks, newTask];
  } else {
    const referenceTask = activeOnly[targetActiveIndex];
    const realIndex = tasks.findIndex((t) => t.id === referenceTask.id);
    const copy = [...tasks];
    copy.splice(realIndex, 0, newTask);
    return copy;
  }
}

function insertNewHabitRecord(habits, { label, hex, position }) {
  const cleanLabel = label.trim().substring(0, 16).toUpperCase();
  if (!cleanLabel) {
    throw new Error('Cannot create a habit without a valid label.');
  }
  const newHabit = {
    id: generateSafeId('habit'),
    label: cleanLabel,
    hex: hex || '#22d3ee',
    nameHistory: [{ title: cleanLabel, at: formatISODate(new Date()) }],
    data: {},
  };

  const parsedPos = parseInt(position, 10);
  const pos = Number.isFinite(parsedPos) ? parsedPos : 1;
  const targetIndex = Math.max(0, Math.min(pos - 1, habits.length));

  const copy = [...habits];
  copy.splice(targetIndex, 0, newHabit);
  return copy;
}

function moveTaskOrder(tasks, taskId, direction) {
  const activeTasks = tasks.filter((t) => !t.isArchived);
  const fromIndex = activeTasks.findIndex((t) => t.id === taskId);
  if (fromIndex === -1) return tasks;

  const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
  if (toIndex < 0 || toIndex >= activeTasks.length) return tasks;

  const targetTask = activeTasks[toIndex];
  const fullFrom = tasks.findIndex((t) => t.id === taskId);
  const fullTo = tasks.findIndex((t) => t.id === targetTask.id);

  const copy = [...tasks];
  const temp = copy[fullFrom];
  copy[fullFrom] = copy[fullTo];
  copy[fullTo] = temp;
  return copy;
}

// ============================================================================
// MAIN APPLICATION COMPONENT (LAYERED ARCHITECTURE)
// ============================================================================

export default function App() {
  const [tasks, setTasks] = useState(loadPersistedTasks);
  const [habits, setHabits] = useState(loadPersistedHabits);
  const [revisions, setRevisions] = useState(loadPersistedRevisions);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Viewport & Layered Geometry State
  const [zoom, setZoom] = useState(1.0);
  const [habitRailWidth, setHabitRailWidth] = useState(160);
  const [historyUnlocked, setHistoryUnlocked] = useState(false);

  // Real-time clock & Midnight Turnover Poll (60s)
  const [now, setNow] = useState(() => new Date());
  const todayIso = useMemo(() => formatISODate(now), [now]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rollover unfinished deep work (state 2) from past days into completed (1) and active today (2)
  useEffect(() => {
    setTasks((prevTasks) => {
      let modified = false;
      const updated = prevTasks.map((t) => {
        if (t.isArchived || !t.matrix) return t;
        let taskChanged = false;
        const nextMatrix = { ...t.matrix };
        Object.keys(nextMatrix).forEach((iso) => {
          if (iso < todayIso && nextMatrix[iso] === 2) {
            nextMatrix[iso] = 1;
            if (!nextMatrix[todayIso]) {
              nextMatrix[todayIso] = 2;
            }
            taskChanged = true;
            modified = true;
          }
        });
        return taskChanged ? { ...t, matrix: nextMatrix } : t;
      });
      return modified ? updated : prevTasks;
    });
  }, [todayIso]);

  // Dynamic 90-day past snapped to Sunday + 14-day future horizon
  const timelineDays = useMemo(
    () => generateTimelineDays(now, tasks, habits),
    [now, tasks, habits]
  );

  const todayIndex = useMemo(() => {
    const idx = timelineDays.findIndex((d) => d.isoDate === todayIso);
    return idx !== -1 ? idx : 21;
  }, [timelineDays, todayIso]);

  const activeTasks = useMemo(() => tasks.filter((t) => !t.isArchived), [tasks]);
  const archivedTasks = useMemo(() => tasks.filter((t) => t.isArchived), [tasks]);

  // Compute Layered Geometry
  const geometry = useMemo(
    () =>
      computeBoardGeometry({
        activeTasks,
        habits,
        timelineDays,
        todayIso,
        zoom,
      }),
    [activeTasks, habits, timelineDays, todayIso, zoom]
  );

  // Ensure habitRailWidth accommodates habits or user drag
  const effectiveHabitRailWidth = useMemo(() => {
    const minRequiredByTracks = Math.max(120, habits.length * geometry.habitStep + 56);
    return Math.max(120, Math.min(360, Math.max(habitRailWidth, minRequiredByTracks)));
  }, [habitRailWidth, habits.length, geometry.habitStep]);

  // Modals & Drawers State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', hex: '#34d399', position: 1 });

  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [habitForm, setHabitForm] = useState({ label: '', hex: '#22d3ee', position: 1 });

  const [activeHabitPopoutId, setActiveHabitPopoutId] = useState(null);
  const [habitPopoutForm, setHabitPopoutForm] = useState({ label: '', hex: '#22d3ee' });

  const [notesDrawerTaskId, setNotesDrawerTaskId] = useState(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [historyModalTask, setHistoryModalTask] = useState(null);
  const [revisionsModalOpen, setRevisionsModalOpen] = useState(false);
  const [dockColorPickerOpen, setDockColorPickerOpen] = useState(false);

  const [importFilePayload, setImportFilePayload] = useState(null);
  const [selectedImportTaskIds, setSelectedImportTaskIds] = useState(new Set());

  const [purgeConfirmId, setPurgeConfirmId] = useState(null);
  const [purgeInputText, setPurgeInputText] = useState('');

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');

  // Refs for Scroll Sync & Resizable Rail
  const scrollContainerRef = useRef(null);
  const headerTaskScrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const isResizingRailRef = useRef(false);

  // Persist to LocalStorage
  useEffect(() => {
    persistState(tasks, habits, revisions);
  }, [tasks, habits, revisions]);

  const snapshotState = useCallback(
    (reason = 'Manual Change') => {
      const snap = {
        id: generateSafeId('rev'),
        at: new Date().toLocaleTimeString(),
        reason,
        tasks: JSON.parse(JSON.stringify(tasks)),
        habits: JSON.parse(JSON.stringify(habits)),
      };
      setRevisions((prev) => [snap, ...prev.slice(0, 19)]);
    },
    [tasks, habits]
  );

  // True Focus Week Navigation: anchors the current sprint's Sunday cleanly in view
  const focusCurrentWeek = useCallback(
    (smooth = true) => {
      if (!scrollContainerRef.current) return;
      let anchorIdx = todayIndex;
      while (anchorIdx > 0 && !timelineDays[anchorIdx].isSunday) {
        anchorIdx--;
      }
      const targetScroll =
        geometry.canvasPadY + Math.max(0, anchorIdx - 1) * geometry.rowHeight;
      scrollContainerRef.current.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    [todayIndex, timelineDays, geometry.canvasPadY, geometry.rowHeight]
  );

  useEffect(() => {
    focusCurrentWeek(false);
  }, [todayIndex]);

  // Ctrl + MouseWheel Continuous Zoom (0.6x to 1.6x)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        setZoom((prev) => {
          const next = Math.round((prev + delta) * 100) / 100;
          return Math.max(0.6, Math.min(1.6, next));
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Horizontal Resizable Divider Mouse Handler
  const handleStartRailResize = useCallback(
    (e) => {
      e.preventDefault();
      isResizingRailRef.current = true;
      const startX = e.clientX;
      const startWidth = effectiveHabitRailWidth;

      const handleMouseMove = (moveEvent) => {
        if (!isResizingRailRef.current) return;
        const deltaX = moveEvent.clientX - startX;
        const nextWidth = Math.max(120, Math.min(360, startWidth + deltaX));
        setHabitRailWidth(nextWidth);
      };

      const handleMouseUp = () => {
        isResizingRailRef.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [effectiveHabitRailWidth]
  );

  // Synchronize Horizontal Scroll between Task Canvas and Task Headers
  const handleStreamScroll = (e) => {
    if (headerTaskScrollRef.current) {
      headerTaskScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  // Native File Export (Save As Dialog via showSaveFilePicker or direct Blob download)
  const handleExportBackup = async () => {
    const suggestedName = `consistency_tracker_backup_${todayIso}.json`;
    const jsonPayload = JSON.stringify({ tasks, habits, exportedAt: new Date().toISOString() }, null, 2);

    if (typeof window.showSaveFilePicker === 'function') {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'JSON Backup File',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(jsonPayload);
      await writable.close();
    } else {
      const blob = new Blob([jsonPayload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  };

  // Strict File Import (Fails loudly if JSON or schema is invalid)
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = JSON.parse(ev.target.result);
      if (!parsed || !Array.isArray(parsed.tasks)) {
        throw new Error('Invalid backup file: Root JSON must contain a "tasks" array.');
      }
      const validatedTasks = parsed.tasks.map(validateAndNormalizeTask);
      const validatedHabits = Array.isArray(parsed.habits)
        ? parsed.habits.map(validateAndNormalizeHabit)
        : [];
      setImportFilePayload({ tasks: validatedTasks, habits: validatedHabits });
      setSelectedImportTaskIds(new Set(validatedTasks.map((t) => t.id)));
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

  // Task & Habit CRUD Handlers
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    snapshotState(`Spawn Task: ${taskForm.title}`);
    setTasks((prev) =>
      insertNewTaskRecord(prev, {
        title: taskForm.title,
        hex: taskForm.hex,
        position: parseInt(taskForm.position, 10),
      })
    );
    setTaskModalOpen(false);
  };

  const handleCreateHabit = (e) => {
    e.preventDefault();
    if (!habitForm.label.trim()) return;
    snapshotState(`Spawn Habit: ${habitForm.label}`);
    setHabits((prev) =>
      insertNewHabitRecord(prev, {
        label: habitForm.label,
        hex: habitForm.hex,
        position: parseInt(habitForm.position, 10),
      })
    );
    setHabitModalOpen(false);
  };

  const handleArchiveTask = useCallback(
    (taskId) => {
      snapshotState('Archive Task');
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isArchived: true } : t)));
      setSelectedTaskId((prev) => (prev === taskId ? null : prev));
      setNotesDrawerTaskId((prev) => (prev === taskId ? null : prev));
    },
    [snapshotState]
  );

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

  // Sprint Notes Handlers
  const handleAddSprintLog = (taskId, sprintKey, text) => {
    if (!text || !text.trim()) return;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const notes = { ...(t.notes || {}) };
        const currentSprint = notes[sprintKey] || { logs: [], pending: '' };
        const newLog = {
          id: generateSafeId('log'),
          at: new Date().toISOString(),
          text: text.trim(),
        };
        notes[sprintKey] = {
          ...currentSprint,
          logs: [...(currentSprint.logs || []), newLog],
        };
        return { ...t, notes };
      })
    );
  };

  const handleEditSprintLog = (taskId, sprintKey, logId, newText) => {
    if (!newText || !newText.trim()) return;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const notes = { ...(t.notes || {}) };
        if (!notes[sprintKey]) return t;
        notes[sprintKey] = {
          ...notes[sprintKey],
          logs: (notes[sprintKey].logs || []).map((l) =>
            l.id === logId
              ? { ...l, text: newText.trim(), editedAt: new Date().toISOString() }
              : l
          ),
        };
        return { ...t, notes };
      })
    );
  };

  const handleDeleteSprintLog = (taskId, sprintKey, logId) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const notes = { ...(t.notes || {}) };
        if (!notes[sprintKey]) return t;
        notes[sprintKey] = {
          ...notes[sprintKey],
          logs: (notes[sprintKey].logs || []).filter((l) => l.id !== logId),
        };
        return { ...t, notes };
      })
    );
  };

  const handleUpdateSprintPending = (taskId, sprintKey, pendingText) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const notes = { ...(t.notes || {}) };
        const currentSprint = notes[sprintKey] || { logs: [], pending: '' };
        notes[sprintKey] = {
          ...currentSprint,
          pending: pendingText,
        };
        return { ...t, notes };
      })
    );
  };

  const selectedTask = activeTasks.find((t) => t.id === selectedTaskId) || null;
  const todayStatus = selectedTask ? selectedTask.matrix?.[todayIso] || 0 : 0;
  const currentDayInfo = timelineDays[todayIndex] || {
    weekNum: getWeekNumber(now),
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

  const activeHabitForPopout = habits.find((h) => h.id === activeHabitPopoutId) || null;
  const notesDrawerTask = activeTasks.find((t) => t.id === notesDrawerTaskId) || null;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505] text-white font-mono select-none overflow-hidden relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json"
        className="hidden"
      />

      {/* ====================================================================
          LAYER 4A: TOP NAVIGATION & CONTROLS BAR
         ==================================================================== */}
      <header className="h-14 border-b border-white/10 bg-[#0a0a0a] flex items-center px-6 shrink-0 z-40 justify-between">
        <div className="flex items-center gap-5">
          <span className="text-[11px] font-black tracking-[0.2em] uppercase text-neutral-400">
            Sprint Board
          </span>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="text-[11px] text-neutral-300 font-bold tracking-widest uppercase">
            Week {currentDayInfo.weekNum}{' '}
            <span className="text-neutral-600 mx-2">/</span>
            <span className={currentDayInfo.isSunday ? 'text-amber-400 font-black' : ''}>
              {currentDayInfo.dayName} {currentDayInfo.dateStr}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Unlock History (Past-Day Backfill Toggle) */}
          <button
            onClick={() => setHistoryUnlocked((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              historyUnlocked
                ? 'bg-amber-500/15 border-amber-400/50 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
            title="Unlock past days to backfill missed entries"
          >
            {historyUnlocked ? <Unlock size={12} /> : <Lock size={12} />}
            <span>{historyUnlocked ? 'History Unlocked' : 'Unlock History'}</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2 py-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10))}
              className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              title="Zoom Out (or Ctrl + Scroll)"
            >
              <ZoomOut size={12} />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="text-[10px] font-bold text-neutral-300 hover:text-white px-1.5 cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(1.6, Math.round((z + 0.1) * 10) / 10))}
              className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              title="Zoom In (or Ctrl + Scroll)"
            >
              <ZoomIn size={12} />
            </button>
          </div>

          {/* Focus Week */}
          <button
            onClick={() => focusCurrentWeek(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            title="Anchor view to current sprint week"
          >
            <LocateFixed size={13} />
            <span>Focus Week</span>
          </button>

          {/* Backup, Import, Revisions, Vault */}
          <div className="flex items-center gap-1 border-l border-white/10 pl-2.5">
            <button
              onClick={handleExportBackup}
              className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Save Backup JSON (Save As)"
            >
              <Download size={14} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Import Tracks from Backup JSON"
            >
              <Upload size={14} />
            </button>
            <button
              onClick={() => setRevisionsModalOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Board Snapshots & Rollbacks"
            >
              <Layers size={14} />
            </button>
            <button
              onClick={() => setVaultOpen(true)}
              className="relative p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Open Archive Vault"
            >
              <Archive size={14} />
              {archivedTasks.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          </div>

          {/* Spawn Task */}
          <button
            onClick={() => {
              setTaskForm({ title: '', hex: '#34d399', position: activeTasks.length + 1 });
              setTaskModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors text-[10px] font-black tracking-widest uppercase cursor-pointer"
          >
            <Plus size={14} strokeWidth={3} />
            <span>New Task</span>
          </button>
        </div>
      </header>

      {/* ====================================================================
          STICKY SUB-HEADER: HABIT BADGES + RESIZE HANDLE + DATE + TASK CARDS
         ==================================================================== */}
      <div className="h-14 border-b border-white/10 bg-[#0a0a0a] flex shrink-0 z-30 relative">
        {/* Pinned Left: Habit Rail Header with Pegged '+' Button */}
        <div
          style={{ width: `${effectiveHabitRailWidth}px` }}
          className="border-r border-white/10 relative shrink-0 z-20 bg-[#0a0a0a] flex items-center"
        >
          {geometry.habitLanes.map(({ habit, idx, centerX }) => {
            const firstLetter = habit.label.charAt(0).toUpperCase();
            const isStaggered = idx % 2 === 1;
            const isSelected = activeHabitPopoutId === habit.id;

            return (
              <div
                key={habit.id}
                style={{ left: `${centerX}px` }}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
              >
                <button
                  onClick={() => {
                    if (isSelected) {
                      setActiveHabitPopoutId(null);
                    } else {
                      setActiveHabitPopoutId(habit.id);
                      setHabitPopoutForm({ label: habit.label, hex: habit.hex });
                    }
                  }}
                  style={{
                    transform: isStaggered ? 'translateY(6px)' : 'translateY(-6px)',
                    borderColor: habit.hex,
                    color: habit.hex,
                    boxShadow: isSelected ? `0 0 10px ${habit.hex}80` : 'none',
                  }}
                  className="w-6 h-6 rounded-full border-2 bg-[#121212] hover:scale-110 flex items-center justify-center text-[10px] font-black tracking-wider transition-transform cursor-pointer"
                  title={`${habit.label} — Click to edit`}
                >
                  {firstLetter}
                </button>
              </div>
            );
          })}

          {/* Dynamically Pegged '+' Button */}
          <button
            onClick={() => {
              setHabitForm({ label: '', hex: '#22d3ee', position: habits.length + 1 });
              setHabitModalOpen(true);
            }}
            title="Add Habit Track"
            style={{
              left: `${
                habits.length > 0
                  ? 24 + habits.length * geometry.habitStep + 4
                  : 24
              }px`,
            }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer border border-dashed border-white/20 hover:border-white/50"
          >
            <Plus size={12} />
          </button>

          {/* Resizable Divider Handle in Header */}
          <div
            onMouseDown={handleStartRailResize}
            title="Drag to resize Habit Rail"
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-400/40 transition-colors flex items-center justify-center z-30"
          >
            <GripVertical size={10} className="text-neutral-600 pointer-events-none" />
          </div>
        </div>

        {/* Pinned Left: Date Column Header */}
        <div
          style={{ width: `${DATE_COL_WIDTH}px` }}
          className="border-r border-white/10 flex items-center justify-center shrink-0 z-20 bg-[#0a0a0a]"
        >
          <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">
            DATE
          </span>
        </div>

        {/* Layer 4B: Horizontally Synced Task Column Headers */}
        <div ref={headerTaskScrollRef} className="flex-1 overflow-hidden relative no-scrollbar">
          <div
            style={{ width: `${geometry.taskCanvasWidth}px`, height: '100%' }}
            className="relative"
          >
            {geometry.taskColumns.map(({ task, idx, left, width, currentStreak, totalDays }) => {
              const isSelected = selectedTaskId === task.id;
              return (
                <div
                  key={task.id}
                  style={{ left: `${left}px`, width: `${width}px` }}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`group absolute h-full flex flex-col items-center justify-center px-1 cursor-pointer transition-colors ${
                    isSelected ? 'text-white bg-white/[0.03]' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-1 justify-center w-full">
                    {/* Hover-Revealed Move Left */}
                    <button
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        snapshotState(`Reorder Task Left: ${task.title}`);
                        setTasks((prev) => moveTaskOrder(prev, task.id, 'left'));
                      }}
                      className={`opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition-opacity ${
                        idx === 0
                          ? ' invisible'
                          : 'text-neutral-500 hover:text-white cursor-pointer'
                      }`}
                      title="Shift Left"
                    >
                      <ChevronLeft size={11} />
                    </button>

                    {/* Single Swatch Dot */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: task.hex,
                        boxShadow: `0 0 6px ${task.hex}80`,
                      }}
                    />

                    {/* Truncated Title / Inline Rename */}
                    {editingTaskId === task.id ? (
                      <input
                        type="text"
                        maxLength={16}
                        value={editingTaskTitle}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditingTaskTitle(e.target.value)}
                        onBlur={() => {
                          setTasks((prev) => renameTaskRecord(prev, task.id, editingTaskTitle));
                          setEditingTaskId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setTasks((prev) => renameTaskRecord(prev, task.id, editingTaskTitle));
                            setEditingTaskId(null);
                          }
                        }}
                        className="w-20 bg-black border border-white/30 rounded px-1 text-[10px] text-center text-white outline-none uppercase"
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingTaskId(task.id);
                          setEditingTaskTitle(task.title);
                        }}
                        title="Double-click to rename"
                        className="text-[10px] font-black uppercase tracking-wider truncate max-w-[72px]"
                      >
                        {task.title}
                      </span>
                    )}

                    {/* Hover-Revealed Move Right */}
                    <button
                      disabled={idx === activeTasks.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        snapshotState(`Reorder Task Right: ${task.title}`);
                        setTasks((prev) => moveTaskOrder(prev, task.id, 'right'));
                      }}
                      className={`opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition-opacity ${
                        idx === activeTasks.length - 1
                          ? 'invisible'
                          : 'text-neutral-500 hover:text-white cursor-pointer'
                      }`}
                      title="Shift Right"
                    >
                      <ChevronRight size={11} />
                    </button>
                  </div>

                  {/* Sub-row: Streak Fire Counter + Quick Triggers */}
                  <div className="flex items-center gap-2 mt-0.5">
                    {currentStreak > 0 ? (
                      <span className="text-[10px] text-amber-400 font-bold">
                        🔥 {currentStreak}d
                      </span>
                    ) : (
                      <span className="text-[9px] text-neutral-600 font-mono">{totalDays}d</span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTaskId(task.id);
                        setNotesDrawerTaskId(task.id);
                      }}
                      className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                      title="Open Sprint Notes Drawer"
                    >
                      <FileText size={10} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryModalTask(task);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-white transition-opacity cursor-pointer"
                      title="Name Evolution History"
                    >
                      <History size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====================================================================
          UNIFIED LAYERED SCROLL VIEWPORT
         ==================================================================== */}
      <div
        ref={scrollContainerRef}
        onScroll={handleStreamScroll}
        className="flex-1 overflow-y-auto overflow-x-auto flex relative bg-[#050505] no-scrollbar select-none"
      >
        {/* LAYER 1: PINNED HABIT RAILS + DRAGGABLE RESIZE DIVIDER */}
        <div
          style={{
            width: `${effectiveHabitRailWidth}px`,
            height: `${geometry.totalStreamHeight}px`,
          }}
          className="border-r border-white/10 bg-[#070707]/95 shrink-0 z-20 sticky left-0 shadow-lg"
        >
          {geometry.habitLanes.map(({ habit, centerX, pillSegments }) => (
            <div
              key={habit.id}
              className="absolute inset-y-0"
              style={{ left: `${centerX - 8}px`, width: '16px' }}
            >
              {/* Subtle vertical guide track */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/[0.04] rounded-full" />

              {/* Connected Vertical Neon Bars */}
              {pillSegments.map((seg, sIdx) => (
                <div
                  key={sIdx}
                  style={{
                    top: `${seg.top}px`,
                    height: `${seg.height}px`,
                    backgroundColor: habit.hex,
                    boxShadow: `0 0 8px ${habit.hex}70`,
                  }}
                  className="absolute left-1/2 -translate-x-1/2 w-[6px] rounded-full pointer-events-none"
                />
              ))}

              {/* Interactive Day Cells (Today or History Unlocked) */}
              {geometry.rows.map((r) => {
                const isToday = r.isoDate === todayIso;
                const isPastOrToday = r.isoDate <= todayIso;
                const canToggle = isToday || (historyUnlocked && isPastOrToday);
                const isTicked = habit.data?.[r.isoDate] === 1;

                return (
                  <div
                    key={r.isoDate}
                    style={{ top: `${r.top}px`, height: `${r.height}px` }}
                    onClick={() => {
                      if (!canToggle) return;
                      setHabits((prev) => toggleHabitDate(prev, habit.id, r.isoDate));
                    }}
                    className={`group absolute inset-x-0 flex items-center justify-center ${
                      canToggle ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {canToggle && !isTicked && (
                      <div
                        className={`w-3 h-3 rounded-full border border-dashed transition-colors ${
                          isToday
                            ? 'border-white/25 hover:border-white/70'
                            : 'border-amber-400/0 group-hover:border-amber-400/60'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Full-Height Draggable Vertical Resize Handle */}
          <div
            onMouseDown={handleStartRailResize}
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400/40 transition-colors z-30"
          />
        </div>

        {/* LAYER 0A: STICKY DATE COLUMN */}
        <div
          style={{
            width: `${DATE_COL_WIDTH}px`,
            height: `${geometry.totalStreamHeight}px`,
            left: `${effectiveHabitRailWidth}px`,
          }}
          className="border-r border-white/10 bg-[#070707]/95 shrink-0 z-20 sticky shadow-[8px_0_16px_rgba(0,0,0,0.6)]"
        >
          {geometry.rows.map((r) => {
            const isToday = r.isoDate === todayIso;
            return (
              <div
                key={r.isoDate}
                style={{ top: `${r.top}px`, height: `${r.height}px` }}
                className="absolute w-full flex items-center px-2.5"
              >
                <div
                  className={`w-full py-1.5 px-2 rounded flex flex-col items-center justify-center border transition-all ${
                    isToday
                      ? 'border-white/40 bg-white/10 shadow-sm'
                      : r.isSunday
                      ? 'border-amber-400/35 bg-amber-400/10 shadow-[0_0_10px_rgba(251,191,36,0.08)]'
                      : 'border-transparent'
                  }`}
                >
                  <span
                    className={`text-[10px] font-black ${
                      isToday
                        ? 'text-white'
                        : r.isSunday
                        ? 'text-amber-400'
                        : 'text-neutral-500'
                    }`}
                  >
                    {r.dayName}
                  </span>
                  <span
                    className={`text-[9px] font-mono ${
                      isToday
                        ? 'text-white font-bold'
                        : r.isSunday
                        ? 'text-amber-300/80 font-bold'
                        : 'text-neutral-600'
                    }`}
                  >
                    {r.dateStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* MULTI-LAYER TASK CANVAS */}
        <div
          className="relative shrink-0"
          style={{
            width: `${geometry.taskCanvasWidth}px`,
            height: `${geometry.totalStreamHeight}px`,
          }}
        >
          {/* LAYER 0B: BASE HORIZONTAL GRID LINES */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {geometry.rows.map((r) => {
              const isToday = r.isoDate === todayIso;
              return (
                <div
                  key={r.isoDate}
                  style={{ top: `${r.top}px`, height: `${r.height}px` }}
                  className={`absolute w-full border-b ${
                    isToday
                      ? 'border-white/25 bg-white/[0.02]'
                      : r.isSunday
                      ? 'border-amber-400/20 bg-amber-400/[0.01]'
                      : 'border-white/[0.05]'
                  }`}
                />
              );
            })}
          </div>

          {/* LAYER 2: DEDICATED SVG UMBILICAL CORDS */}
          <svg
            width={geometry.taskCanvasWidth}
            height={geometry.totalStreamHeight}
            className="absolute inset-0 pointer-events-none z-10"
          >
            {geometry.allSvgCords.map((cord) => (
              <line
                key={cord.id}
                x1={cord.x}
                y1={cord.y1}
                x2={cord.x}
                y2={cord.y2}
                stroke={cord.hex}
                strokeWidth={2.5}
                strokeOpacity={0.75}
                style={{ filter: `drop-shadow(0 0 6px ${cord.hex}90)` }}
              />
            ))}
          </svg>

          {/* LAYER 3: TASK COLUMN LANES, PAST-DAY BACKFILL CELLS & CAPSULE PILLS */}
          <div className="absolute inset-0 z-20">
            {geometry.taskColumns.map(({ task, left, width, blocks }) => {
              const isSelected = selectedTaskId === task.id;

              return (
                <div
                  key={task.id}
                  style={{ left: `${left}px`, width: `${width}px` }}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`absolute h-full transition-colors cursor-pointer ${
                    isSelected ? 'bg-white/[0.035]' : 'hover:bg-white/[0.015]'
                  }`}
                >
                  {/* Center Axis Guide Line */}
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-white/[0.05] pointer-events-none" />

                  {/* Interactive Past-Day Backfill Targets (Active when History Unlocked) */}
                  {historyUnlocked &&
                    geometry.rows.map((r) => {
                      const isPast = r.isoDate < todayIso;
                      if (!isPast) return null;
                      const val = task.matrix?.[r.isoDate] || 0;

                      return (
                        <div
                          key={r.isoDate}
                          style={{ top: `${r.top}px`, height: `${r.height}px` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskId(task.id);
                            snapshotState(`Backfill ${task.title} on ${r.isoDate}`);
                            setTasks((prev) =>
                              executeMatrixAction(prev, task.id, 'TOGGLE_PAST', r.isoDate)
                            );
                          }}
                          title={`Click to toggle ${r.dayName} ${r.dateStr}`}
                          className="group absolute inset-x-0 flex items-center justify-center z-30 cursor-pointer"
                        >
                          <div
                            className={`w-6 h-6 rounded-full border border-dashed transition-all flex items-center justify-center ${
                              val > 0
                                ? 'border-black/40 group-hover:border-white bg-black/20'
                                : 'border-amber-400/20 group-hover:border-amber-400/80 group-hover:bg-amber-400/10'
                            }`}
                          />
                        </div>
                      );
                    })}
                </div>
              );
            })}

            {/* Strictly Centered Vertical Capsule Pills */}
            {geometry.taskColumns.map(({ task, blocks }) =>
              blocks.map((blk) => (
                <div
                  key={blk.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTaskId(task.id);
                    setNotesDrawerTaskId(task.id);
                  }}
                  title={`${task.title} (${blk.daysCount}d sprint) — Click to view/add sprint notes`}
                  style={{
                    left: `${blk.left}px`,
                    top: `${blk.top}px`,
                    width: `${blk.width}px`,
                    height: `${blk.height}px`,
                    backgroundColor: task.hex,
                    boxShadow: `0 0 10px ${task.hex}60`,
                  }}
                  className={`absolute rounded-full flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-[1.03] z-20 ${
                    blk.isActive ? 'ring-[3px] ring-white' : ''
                  }`}
                >
                  <span className="text-[10px] font-black text-black/85 rotate-90 select-none">
                    {blk.daysCount}d
                  </span>
                  {blk.hasNotes && (
                    <span
                      className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-black/80"
                      title="Has Sprint Notes"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
          LAYER 4C: BOTTOM ACTION DOCK
         ==================================================================== */}
      <footer className="h-16 border-t border-white/10 bg-[#0a0a0a] flex items-center justify-between px-8 shrink-0 z-40">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            Selected:
          </span>
          <span className="text-[12px] font-black uppercase tracking-widest text-white">
            {selectedTask ? selectedTask.title : 'None'}
          </span>

          {selectedTask && (
            <div className="flex items-center gap-2.5 ml-3">
              {/* Single Circular Color Button Opening Centered Popover */}
              <button
                onClick={() => setDockColorPickerOpen(true)}
                style={{
                  backgroundColor: selectedTask.hex,
                  boxShadow: `0 0 8px ${selectedTask.hex}80`,
                }}
                className="w-5 h-5 rounded-full border border-white/40 cursor-pointer hover:scale-110 transition-transform"
                title="Change Channel Color"
              />

              {/* Open Sprint Notes Button */}
              <button
                onClick={() => setNotesDrawerTaskId(selectedTask.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
              >
                <FileText size={11} />
                <span>Sprint Notes</span>
              </button>

              {/* Archive Button */}
              <button
                onClick={() => handleArchiveTask(selectedTask.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
                title="Archive channel to Vault (Delete key)"
              >
                <Archive size={12} />
                <span>Archive</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={!selectedTask || todayStatus === 2}
            onClick={() =>
              setTasks((prev) => executeMatrixAction(prev, selectedTask.id, 'START', todayIso))
            }
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
            onClick={() =>
              setTasks((prev) => executeMatrixAction(prev, selectedTask.id, 'STOP', todayIso))
            }
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors border ${
              !selectedTask || todayStatus !== 2
                ? 'border-white/5 text-white/20 cursor-default'
                : 'border-white text-white hover:bg-white/10 cursor-pointer'
            }`}
          >
            <Square
              size={14}
              fill={!selectedTask || todayStatus !== 2 ? 'currentColor' : 'white'}
            />
            <span>Mark Ended</span>
          </button>

          <button
            disabled={!selectedTask || todayStatus === 0}
            onClick={() =>
              setTasks((prev) => executeMatrixAction(prev, selectedTask.id, 'UNDO', todayIso))
            }
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

      {/* ====================================================================
          LAYER 5: POPOUTS, SLIDE-OUT DRAWERS & MODALS
         ==================================================================== */}

      {/* 5A: HABIT POPOUT CARD (Full Name Editor, Stats & Delete) */}
      {activeHabitForPopout && (
        <div
          onClick={() => setActiveHabitPopoutId(null)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-5 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: habitPopoutForm.hex }}
                />
                <span className="text-[11px] font-black uppercase tracking-widest text-white">
                  Edit Habit Track
                </span>
              </div>
              <button
                onClick={() => setActiveHabitPopoutId(null)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div>
              <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
                Habit Name (Max 16 chars)
              </label>
              <input
                type="text"
                maxLength={16}
                autoFocus
                value={habitPopoutForm.label}
                onChange={(e) =>
                  setHabitPopoutForm((prev) => ({
                    ...prev,
                    label: e.target.value.toUpperCase(),
                  }))
                }
                className="w-full bg-[#141414] border border-white/15 rounded-lg px-3 py-2 text-xs text-white uppercase outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
                Neon Color
              </label>
              <div className="flex items-center gap-3 bg-[#141414] p-2 rounded-lg border border-white/10">
                <input
                  type="color"
                  value={habitPopoutForm.hex}
                  onChange={(e) =>
                    setHabitPopoutForm((prev) => ({ ...prev, hex: e.target.value }))
                  }
                  className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-none outline-none"
                />
                <span className="text-xs font-mono uppercase text-white font-bold">
                  {habitPopoutForm.hex}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-neutral-400 bg-[#141414] px-3 py-2 rounded-lg border border-white/5">
              <span>Total Logged Days:</span>
              <span className="text-white font-bold">
                {Object.values(activeHabitForPopout.data || {}).filter((v) => v === 1).length} Days
              </span>
            </div>

            {(activeHabitForPopout.nameHistory || []).length > 1 && (
              <div className="text-[9px] text-neutral-400 space-y-1 max-h-24 overflow-y-auto border-t border-white/10 pt-2">
                <div className="uppercase text-neutral-500 font-bold">Past Names:</div>
                {activeHabitForPopout.nameHistory.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>• {item.title}</span>
                    <span className="text-neutral-600">{item.at}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
              <button
                type="button"
                onClick={() => {
                  snapshotState(`Delete Habit: ${activeHabitForPopout.label}`);
                  setHabits((prev) => prev.filter((h) => h.id !== activeHabitForPopout.id));
                  setActiveHabitPopoutId(null);
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHabits((prev) =>
                    renameHabitRecord(
                      prev,
                      activeHabitForPopout.id,
                      habitPopoutForm.label,
                      habitPopoutForm.hex
                    )
                  );
                  setActiveHabitPopoutId(null);
                }}
                className="flex-1 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 text-[10px] font-black uppercase tracking-wider cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5B: CENTERED DOCK COLOR PICKER POPOVER */}
      {dockColorPickerOpen && selectedTask && (
        <div
          onClick={() => setDockColorPickerOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-5 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-white">
                Channel Color — {selectedTask.title}
              </span>
              <button
                onClick={() => setDockColorPickerOpen(false)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-[#141414] p-3 rounded-xl border border-white/10">
              <input
                type="color"
                value={selectedTask.hex}
                onChange={(e) => {
                  const newHex = e.target.value;
                  setTasks((prev) =>
                    prev.map((t) => (t.id === selectedTask.id ? { ...t, hex: newHex } : t))
                  );
                }}
                className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-none outline-none"
              />
              <span className="text-sm font-mono uppercase text-white font-bold">
                {selectedTask.hex}
              </span>
            </div>

            <button
              onClick={() => setDockColorPickerOpen(false)}
              className="w-full py-2 rounded-lg bg-white text-black hover:bg-neutral-200 text-[10px] font-black uppercase tracking-wider cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 5C: SPRINT-LINKED NOTES DRAWER (Right Slide-Out Panel) */}
      {notesDrawerTask && (
        <SprintNotesDrawer
          task={notesDrawerTask}
          timelineDays={timelineDays}
          todayIso={todayIso}
          onClose={() => setNotesDrawerTaskId(null)}
          onAddLog={handleAddSprintLog}
          onEditLog={handleEditSprintLog}
          onDeleteLog={handleDeleteSprintLog}
          onUpdatePending={handleUpdateSprintPending}
        />
      )}

      {/* 5D: CREATE TASK MODAL */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-white">
                Create Task Column
              </span>
              <button
                onClick={() => setTaskModalOpen(false)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
                  Task Name (Max 16 chars)
                </label>
                <input
                  type="text"
                  maxLength={16}
                  required
                  autoFocus
                  placeholder="e.g. Mechanical Rig..."
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
                  Fluid Color
                </label>
                <div className="flex items-center gap-3 bg-[#141414] p-2 rounded-lg border border-white/10">
                  <input
                    type="color"
                    value={taskForm.hex}
                    onChange={(e) => setTaskForm({ ...taskForm, hex: e.target.value })}
                    className="w-9 h-9 rounded-full cursor-pointer bg-transparent border-none outline-none"
                  />
                  <span className="text-xs font-mono uppercase text-white font-bold">
                    {taskForm.hex}
                  </span>
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

      {/* 5E: CREATE HABIT MODAL */}
      {habitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-white">
                Create Habit Track
              </span>
              <button
                onClick={() => setHabitModalOpen(false)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
                  Habit Label (Max 16 letters)
                </label>
                <input
                  type="text"
                  maxLength={16}
                  required
                  autoFocus
                  placeholder="e.g. WORKOUT"
                  value={habitForm.label}
                  onChange={(e) =>
                    setHabitForm({ ...habitForm, label: e.target.value.toUpperCase() })
                  }
                  className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs text-white uppercase outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest font-black text-neutral-400 block mb-1.5">
                  Track Color
                </label>
                <div className="flex items-center gap-3 bg-[#141414] p-2 rounded-lg border border-white/10">
                  <input
                    type="color"
                    value={habitForm.hex}
                    onChange={(e) => setHabitForm({ ...habitForm, hex: e.target.value })}
                    className="w-9 h-9 rounded-full cursor-pointer bg-transparent border-none outline-none"
                  />
                  <span className="text-xs font-mono uppercase text-white font-bold">
                    {habitForm.hex}
                  </span>
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

      {/* 5F: NAME EVOLUTION HISTORY MODAL */}
      {historyModalTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <History size={14} className="text-amber-400" />
                <span className="text-[11px] font-black uppercase tracking-widest text-white">
                  {historyModalTask.title} — History
                </span>
              </div>
              <button
                onClick={() => setHistoryModalTask(null)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto">
              {(historyModalTask.nameHistory || []).map((entry, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-[#141414] p-2.5 rounded-lg border border-white/5"
                >
                  <span className="text-xs font-bold text-white uppercase">{entry.title}</span>
                  <span className="text-[9px] font-mono text-neutral-500">{entry.at}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setHistoryModalTask(null)}
              className="w-full py-2 bg-white text-black font-black uppercase text-[10px] tracking-wider rounded-lg hover:bg-neutral-200 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 5G: SELECTIVE IMPORT INSPECTOR MODAL */}
      {importFilePayload && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-white block">
                  Inspect & Restore Tracks
                </span>
                <span className="text-[10px] text-neutral-400">
                  Select specific tasks to extract from this backup:
                </span>
              </div>
              <button
                onClick={() => setImportFilePayload(null)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {importFilePayload.tasks.map((t, idx) => {
                const isSelected = selectedImportTaskIds.has(t.id);
                const loggedDays = Object.values(t.matrix || {}).filter((v) => v > 0).length;

                return (
                  <div
                    key={`${t.id}-${idx}`}
                    onClick={() => {
                      setSelectedImportTaskIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.id)) next.delete(t.id);
                        else next.add(t.id);
                        return next;
                      });
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-[#141414] border-white/5 text-neutral-500 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded bg-black border-white/20 accent-white cursor-pointer"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: t.hex }}
                      />
                      <span className="text-xs font-bold uppercase">{t.title}</span>
                    </div>
                    <span className="text-[9px] font-mono text-neutral-400">
                      {loggedDays} Days
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <button
                disabled={selectedImportTaskIds.size === 0}
                onClick={() => handleExecuteSelectiveImport('active')}
                className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
                  selectedImportTaskIds.size === 0
                    ? 'bg-white/5 text-white/20 cursor-default'
                    : 'bg-white text-black hover:bg-neutral-200 cursor-pointer'
                }`}
              >
                Restore Selected to Timeline ({selectedImportTaskIds.size})
              </button>

              <button
                disabled={selectedImportTaskIds.size === 0}
                onClick={() => handleExecuteSelectiveImport('vault')}
                className={`w-full py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors border ${
                  selectedImportTaskIds.size === 0
                    ? 'border-white/5 text-white/20 cursor-default'
                    : 'border-amber-400/40 text-amber-400 hover:bg-amber-400/10 cursor-pointer'
                }`}
              >
                Send Selected Straight to Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5H: BOARD SNAPSHOTS & ROLLBACK MODAL */}
      {revisionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" />
                <span className="text-[11px] font-black uppercase tracking-widest text-white">
                  Board Snapshots
                </span>
              </div>
              <button
                onClick={() => setRevisionsModalOpen(false)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {revisions.length === 0 ? (
                <div className="text-center py-8 text-neutral-600 text-xs">
                  No previous snapshots stored.
                </div>
              ) : (
                revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#141414] border border-white/5"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{rev.reason}</div>
                      <div className="text-[9px] text-neutral-500">
                        {rev.at} · {rev.tasks?.length || 0} Tasks
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        snapshotState('Rollback to Snapshot');
                        setTasks(rev.tasks.map(validateAndNormalizeTask));
                        setHabits(rev.habits.map(validateAndNormalizeHabit));
                        setRevisionsModalOpen(false);
                      }}
                      className="px-2.5 py-1 bg-white text-black hover:bg-neutral-200 text-[9px] font-black uppercase tracking-wider rounded cursor-pointer"
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setRevisionsModalOpen(false)}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold uppercase text-[10px] rounded-lg cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 5I: ARCHIVE VAULT DRAWER (Soft-Delete & Typed DELETE Purge) */}
      {vaultOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-[#0a0a0a] border-l border-white/10 h-full p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Archive size={16} className="text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-white">
                    Task Archive Vault
                  </span>
                </div>
                <button
                  onClick={() => setVaultOpen(false)}
                  className="text-neutral-500 hover:text-white cursor-pointer"
                >
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
                    const loggedDays = Object.values(t.matrix || {}).filter((v) => v > 0).length;
                    const history = Array.isArray(t.nameHistory) ? t.nameHistory : [];

                    return (
                      <div
                        key={t.id}
                        className="bg-[#121212] border border-white/10 rounded-xl p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: t.hex }}
                            />
                            <span className="text-xs font-black text-white uppercase">
                              {t.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-bold">
                            {loggedDays} Days Total
                          </span>
                        </div>

                        {history.length > 1 && (
                          <div className="bg-black/40 p-2 rounded text-[9px] text-neutral-400 flex flex-col gap-1">
                            <span className="font-bold text-neutral-500 flex items-center gap-1">
                              <History size={10} /> Name History:
                            </span>
                            {history.map((h, hIdx) => (
                              <span key={hIdx} className="pl-3 border-l border-white/10">
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
                                disabled={purgeInputText.trim().toUpperCase() !== 'DELETE'}
                                className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors ${
                                  purgeInputText.trim().toUpperCase() === 'DELETE'
                                    ? 'bg-red-600 text-white cursor-pointer'
                                    : 'bg-red-950/40 text-red-500/40 cursor-default'
                                }`}
                              >
                                Purge
                              </button>
                              <button
                                onClick={() => setPurgeConfirmId(null)}
                                className="text-neutral-500 hover:text-white text-xs cursor-pointer"
                              >
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
              Vaulted tasks keep 100% of their historical days and sprint notes intact. Respawning
              restores them to the active timeline without overwriting existing columns.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: SPRINT-LINKED NOTES DRAWER
// ============================================================================

function SprintNotesDrawer({
  task,
  timelineDays,
  todayIso,
  onClose,
  onAddLog,
  onEditLog,
  onDeleteLog,
  onUpdatePending,
}) {
  const [collapsedCards, setCollapsedCards] = useState({});
  const [activeDrafts, setActiveDrafts] = useState({});
  const [editingLogId, setEditingLogId] = useState(null);
  const [editText, setEditText] = useState('');

  const sprintBlocks = useMemo(() => {
    const { blocks } = parseTaskSprintsAndStreak(task, timelineDays, todayIso);
    return [...blocks].reverse();
  }, [task, timelineDays, todayIso]);

  const toggleCollapse = (key) => {
    setCollapsedCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePostNote = (sprintKey) => {
    const draft = activeDrafts[sprintKey];
    if (!draft || !draft.trim()) return;
    onAddLog(task.id, sprintKey, draft);
    setActiveDrafts((prev) => ({ ...prev, [sprintKey]: '' }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-[#070707] border-l border-white/10 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0d0d0d]">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: task.hex, boxShadow: `0 0 10px ${task.hex}` }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-mono font-black uppercase tracking-wider text-white">
                  {task.title}
                </h2>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 uppercase font-bold">
                  Sprint Notes
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">
                {sprintBlocks.length} Contiguous {sprintBlocks.length === 1 ? 'Sprint' : 'Sprints'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white p-1 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sprint Cards Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sprintBlocks.length === 0 ? (
            <div className="text-center py-20 text-neutral-600 font-mono text-xs space-y-2">
              <Calendar size={24} className="mx-auto text-neutral-700" />
              <div>No activity sprints logged yet for this task channel.</div>
              <div className="text-[10px] text-neutral-700">
                Start Today or backfill past days to generate sprint note cards.
              </div>
            </div>
          ) : (
            sprintBlocks.map((blk) => {
              const sprintKey = blk.key;
              const isCollapsed = Boolean(collapsedCards[sprintKey]);
              const sprintNotes = task.notes?.[sprintKey] || { logs: [], pending: '' };

              return (
                <div
                  key={sprintKey}
                  className="w-full bg-[#0e0e0e] border border-white/10 hover:border-white/20 rounded-xl overflow-hidden shadow-lg transition"
                >
                  {/* Collapsible Sprint Banner */}
                  <div
                    onClick={() => toggleCollapse(sprintKey)}
                    className="px-4 py-3 bg-[#141414] border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#191919] transition"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight size={14} className="text-neutral-500" />
                      ) : (
                        <ChevronDown size={14} className="text-neutral-500" />
                      )}
                      <span className="text-xs font-mono font-bold text-neutral-200">
                        {blk.firstDayName} {blk.startDateStr}
                        {blk.startIso !== blk.endIso &&
                          ` – ${blk.lastDayName} ${blk.endDateStr}`}
                      </span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full font-black text-black"
                        style={{ backgroundColor: task.hex }}
                      >
                        {blk.daysCount}d Sprint
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {sprintNotes.logs?.length || 0}{' '}
                      {sprintNotes.logs?.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>

                  {/* Card Body */}
                  {!isCollapsed && (
                    <div className="p-4 space-y-4">
                      {/* Timestamped Log Entries */}
                      <div className="space-y-2.5">
                        {(sprintNotes.logs || []).map((log) => {
                          const dateObj = new Date(log.at);
                          const dateStr = dateObj.toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          });
                          const timeStr = dateObj.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          const isEditingThis = editingLogId === log.id;

                          return (
                            <div
                              key={log.id}
                              className="p-3 bg-[#141414] border border-white/5 rounded-lg group hover:border-white/15 transition space-y-2"
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                                <span className="flex items-center gap-1">
                                  <Clock size={10} /> {dateStr} at {timeStr}
                                  {log.editedAt && (
                                    <span className="text-neutral-600">(edited)</span>
                                  )}
                                </span>

                                {!isEditingThis && (
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                    <button
                                      onClick={() => {
                                        setEditingLogId(log.id);
                                        setEditText(log.text);
                                      }}
                                      title="Edit Note"
                                      className="text-neutral-500 hover:text-white cursor-pointer"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button
                                      onClick={() => onDeleteLog(task.id, sprintKey, log.id)}
                                      title="Delete Note"
                                      className="text-neutral-500 hover:text-red-400 cursor-pointer"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {isEditingThis ? (
                                <div className="space-y-2 pt-1">
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    rows={3}
                                    autoFocus
                                    className="w-full bg-[#0a0a0a] border border-white/20 focus:border-white/40 rounded p-2 text-xs font-mono text-white outline-none resize-none leading-relaxed"
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditingLogId(null);
                                        setEditText('');
                                      }}
                                      className="px-2 py-1 rounded text-[10px] font-mono text-neutral-400 hover:text-white cursor-pointer"
                                    >
                                      CANCEL
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (!editText.trim()) return;
                                        onEditLog(task.id, sprintKey, log.id, editText);
                                        setEditingLogId(null);
                                        setEditText('');
                                      }}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-white text-black font-mono font-black text-[10px] cursor-pointer"
                                    >
                                      <Check size={11} />
                                      <span>SAVE</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs font-mono text-neutral-200 whitespace-pre-wrap leading-relaxed">
                                  {log.text}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* New Note Input */}
                      <div className="space-y-2">
                        <textarea
                          value={activeDrafts[sprintKey] || ''}
                          onChange={(e) =>
                            setActiveDrafts((prev) => ({
                              ...prev,
                              [sprintKey]: e.target.value,
                            }))
                          }
                          placeholder="Log what you accomplished or where you left off..."
                          rows={3}
                          className="w-full bg-[#141414] border border-white/10 focus:border-white/30 rounded-lg p-2.5 text-xs font-mono text-white placeholder-neutral-600 outline-none resize-none leading-relaxed"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={() => handlePostNote(sprintKey)}
                            disabled={!(activeDrafts[sprintKey] || '').trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-mono font-black text-[10px] uppercase tracking-wider disabled:opacity-30 transition cursor-pointer"
                          >
                            <Send size={11} />
                            <span>Post Note</span>
                          </button>
                        </div>
                      </div>

                      {/* Pending / Next Up Field */}
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-wider block">
                          Pending / Next Up:
                        </span>
                        <input
                          type="text"
                          value={sprintNotes.pending || ''}
                          onChange={(e) =>
                            onUpdatePending(task.id, sprintKey, e.target.value)
                          }
                          placeholder="e.g. Next milestone, fix rig weights..."
                          className="w-full bg-[#121212] border border-white/10 focus:border-white/30 rounded px-2.5 py-1.5 text-xs font-mono text-neutral-200 placeholder-neutral-700 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}