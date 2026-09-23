export const ROW_HEIGHT = 72;
export const TRACK_WIDTH = 44;
export const COLUMN_WIDTH = 140;
export const COLUMN_GAP = 40;
export const CANVAS_PAD_X = 48;
export const CANVAS_PAD_Y = 24;

export const getColLeft = (idx) => CANVAS_PAD_X + idx * (COLUMN_WIDTH + COLUMN_GAP);

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Format any date object into local YYYY-MM-DD
export function formatISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Get standard ISO week number (1 - 53)
export function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

// Dynamic timeline generator that scans task data and ensures at least 90 days past + future
export function generateTimelineDays(centerDate = new Date(), tasks = [], habits = []) {
  // Find earliest date recorded in any task or habit
  let earliestTime = new Date(centerDate).getTime() - (90 * 86400000); // Minimum 90 days (3 months) past

  const scanDates = (dateMap) => {
    if (!dateMap || typeof dateMap !== 'object') return;
    Object.keys(dateMap).forEach((iso) => {
      const t = new Date(iso).getTime();
      if (!isNaN(t) && t < earliestTime) {
        earliestTime = t;
      }
    });
  };

  tasks.forEach((t) => scanDates(t.matrix));
  habits.forEach((h) => scanDates(h.data));

  // Align start to the Sunday of that earliest week (with an extra week of padding)
  const startDate = new Date(earliestTime);
  startDate.setDate(startDate.getDate() - startDate.getDay() - 7);
  startDate.setHours(0, 0, 0, 0);

  // Extend 14 days into the future past centerDate
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

const STORAGE_TASKS_KEY = 'flow_tracker_tasks_prod';
const STORAGE_HABITS_KEY = 'flow_tracker_habits_prod';
const STORAGE_REVISIONS_KEY = 'flow_tracker_revisions_prod';

export function generateSafeId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Defensive sanitization: converts legacy array matrices to permanent ISO Date maps
export function sanitizeTask(t) {
  let matrix = {};
  if (t && typeof t.matrix === 'object' && !Array.isArray(t.matrix)) {
    matrix = { ...t.matrix };
  }

  return {
    ...t,
    id: t.id || generateSafeId('col'),
    title: t.title || 'Untitled',
    hex: t.hex || '#34d399',
    streak: typeof t.streak === 'number' ? t.streak : 0,
    isArchived: Boolean(t.isArchived),
    nameHistory: Array.isArray(t.nameHistory) ? t.nameHistory : [{ title: t.title || 'Init', at: formatISODate(new Date()) }],
    matrix, // Date-keyed map: { "2026-09-23": 1 }
  };
}

export function sanitizeHabit(h) {
  let data = {};
  if (h && typeof h.data === 'object' && !Array.isArray(h.data)) {
    data = { ...h.data };
  }

  return {
    ...h,
    id: h.id || generateSafeId('habit'),
    label: (h.label || 'HABIT').substring(0, 8).toUpperCase(),
    hex: h.hex || '#22d3ee',
    nameHistory: Array.isArray(h.nameHistory) ? h.nameHistory : [{ title: h.label || 'Init', at: formatISODate(new Date()) }],
    data, // Date-keyed map: { "2026-09-23": 1 }
  };
}

export function loadPersistedTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_TASKS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.map(sanitizeTask);
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function loadPersistedHabits() {
  try {
    const saved = localStorage.getItem(STORAGE_HABITS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.map(sanitizeHabit);
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function loadPersistedRevisions() {
  try {
    const saved = localStorage.getItem(STORAGE_REVISIONS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function persistState(tasks, habits, revisions = []) {
  try {
    localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_HABITS_KEY, JSON.stringify(habits));
    if (revisions.length) {
      localStorage.setItem(STORAGE_REVISIONS_KEY, JSON.stringify(revisions.slice(-20)));
    }
  } catch (e) {
    console.error('Persistence failed', e);
  }
}

// Parses contiguous habit blocks based on the timeline slice
export function parseHabitBlocks(habitData, timelineDays) {
  const blocks = [];
  let start = null;
  let len = 0;

  for (let i = 0; i < timelineDays.length; i++) {
    const iso = timelineDays[i].isoDate;
    const isCompleted = habitData[iso] === 1;

    if (isCompleted) {
      if (start === null) start = i;
      len++;
    } else {
      if (start !== null) {
        blocks.push({ start, days: len });
        start = null;
        len = 0;
      }
    }
  }
  if (start !== null) {
    blocks.push({ start, days: len });
  }
  return blocks;
}

// Calendar-week streak parser:
// Connects blocks across weeks as long as there is no completely dead calendar week in between.
export function parseTaskMatrix(task, timelineDays) {
  const blocks = [];
  let blockStart = null;
  let blockLen = 0;
  let hasActive = false;

  for (let i = 0; i < timelineDays.length; i++) {
    const iso = timelineDays[i].isoDate;
    const val = task.matrix[iso] || 0;

    if (val > 0) {
      if (blockStart === null) blockStart = i;
      blockLen++;
      if (val === 2) hasActive = true;
    } else {
      if (blockStart !== null) {
        blocks.push({
          start: blockStart,
          days: blockLen,
          isActive: hasActive,
        });
        blockStart = null;
        blockLen = 0;
        hasActive = false;
      }
    }
  }

  if (blockStart !== null) {
    blocks.push({
      start: blockStart,
      days: blockLen,
      isActive: hasActive,
    });
  }

  const cords = [];

  if (blocks.length > 0) {
    for (let b = 0; b < blocks.length - 1; b++) {
      const prevBlock = blocks[b];
      const nextBlock = blocks[b + 1];

      const prevEnd = prevBlock.start + prevBlock.days;
      const nextStart = nextBlock.start;
      const gapLength = nextStart - prevEnd;

      if (gapLength > 0) {
        // Look up the exact dates touched at both ends of the gap
        const lastActiveIndex = prevEnd - 1;
        const nextActiveIndex = nextStart;

        const lastActiveDate = new Date(timelineDays[lastActiveIndex].isoDate);
        const nextActiveDate = new Date(timelineDays[nextActiveIndex].isoDate);

        // Calculate the difference in calendar weeks (Sunday to Saturday boundaries)
        const msPerDay = 86400000;
        // Align both dates to their week's Sunday (start of calendar week)
        const lastSunday = new Date(lastActiveDate);
        lastSunday.setDate(lastActiveDate.getDate() - lastActiveDate.getDay());
        lastSunday.setHours(0, 0, 0, 0);

        const nextSunday = new Date(nextActiveDate);
        nextSunday.setDate(nextActiveDate.getDate() - nextActiveDate.getDay());
        nextSunday.setHours(0, 0, 0, 0);

        const weekDiff = Math.round((nextSunday.getTime() - lastSunday.getTime()) / (7 * msPerDay));

        // Connect if:
        // - In the same week (weekDiff === 0)
        // - In consecutive weeks (weekDiff === 1, e.g. Sunday to next Monday or Saturday)
        // Breaks ONLY if at least one whole week was skipped (weekDiff >= 2)
        if (weekDiff <= 1) {
          cords.push({ startY: prevEnd, endY: nextStart });
        }
      }
    }
  }

  return { blocks, cords };
}

// Action executor keyed directly by real ISO date
export function executeMatrixAction(tasks, taskId, action, todayIso) {
  return tasks.map((task) => {
    if (task.id !== taskId) return task;

    const nextMatrix = { ...(task.matrix || {}) };
    const currentVal = nextMatrix[todayIso] || 0;

    if (action === 'START') {
      if (currentVal === 0) nextMatrix[todayIso] = 2;
    } else if (action === 'STOP') {
      if (currentVal === 2) nextMatrix[todayIso] = 1;
    } else if (action === 'UNDO') {
      delete nextMatrix[todayIso];
    }

    return { ...task, matrix: nextMatrix };
  });
}

// Habit toggle keyed directly by real ISO date
export function toggleHabitToday(habits, habitId, targetIso) {
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

export function renameTask(tasks, taskId, newTitle) {
  const trimmed = newTitle.trim();
  return tasks.map((t) => {
    if (t.id !== taskId || !trimmed || t.title === trimmed) return t;
    const history = t.nameHistory || [];
    return {
      ...t,
      title: trimmed,
      nameHistory: [...history, { title: trimmed, at: formatISODate(new Date()) }]
    };
  });
}

export function renameHabit(habits, habitId, newLabel) {
  const trimmed = newLabel.trim().substring(0, 8).toUpperCase();
  return habits.map((h) => {
    if (h.id !== habitId || !trimmed || h.label === trimmed) return h;
    const history = h.nameHistory || [];
    return {
      ...h,
      label: trimmed,
      nameHistory: [...history, { title: trimmed, at: formatISODate(new Date()) }]
    };
  });
}

export function updateTaskColor(tasks, taskId, newHex) {
  return tasks.map((t) => (t.id === taskId ? { ...t, hex: newHex } : t));
}

export function insertNewTask(tasks, { title, hex, position }) {
  const newTask = {
    id: generateSafeId('col'),
    title: title.trim().substring(0, 16),
    hex: hex || '#34d399',
    streak: 0,
    isArchived: false,
    nameHistory: [{ title: title.trim(), at: formatISODate(new Date()) }],
    matrix: {},
  };

  const parsedPos = parseInt(position, 10);
  const pos = Number.isFinite(parsedPos) ? parsedPos : 1;

  // Filter only visible active tasks to calculate true visual column slot
  const activeOnly = tasks.filter((t) => !t.isArchived);
  const targetActiveIndex = Math.max(0, Math.min(pos - 1, activeOnly.length));

  if (targetActiveIndex >= activeOnly.length) {
    // Append after all current tasks
    return [...tasks, newTask];
  } else {
    // Place right before the active task currently at that slot
    const referenceTask = activeOnly[targetActiveIndex];
    const realIndex = tasks.findIndex((t) => t.id === referenceTask.id);
    const copy = [...tasks];
    copy.splice(realIndex, 0, newTask);
    return copy;
  }
}

export function insertNewHabit(habits, { label, hex, position }) {
  const newHabit = {
    id: generateSafeId('habit'),
    label: label.trim().substring(0, 16).toUpperCase(),
    hex: hex || '#22d3ee',
    nameHistory: [{ title: label.trim().substring(0, 16).toUpperCase(), at: formatISODate(new Date()) }],
    data: {},
  };

  const parsedPos = parseInt(position, 10);
  const pos = Number.isFinite(parsedPos) ? parsedPos : 1;
  const targetIndex = Math.max(0, Math.min(pos - 1, habits.length));

  const copy = [...habits];
  copy.splice(targetIndex, 0, newHabit);
  return copy;
}
export function moveTaskPosition(tasks, taskId, direction) {
  const activeTasks = tasks.filter((t) => !t.isArchived);
  const fromIndex = activeTasks.findIndex((t) => t.id === taskId);
  if (fromIndex === -1) return tasks;

  const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
  if (toIndex < 0 || toIndex >= activeTasks.length) return tasks;

  // Swap target elements in activeTasks
  const targetTask = activeTasks[toIndex];
  
  // Map back to main tasks array
  const fullFrom = tasks.findIndex((t) => t.id === taskId);
  const fullTo = tasks.findIndex((t) => t.id === targetTask.id);

  const copy = [...tasks];
  const temp = copy[fullFrom];
  copy[fullFrom] = copy[fullTo];
  copy[fullTo] = temp;

  return copy;
}