export const ROW_HEIGHT = 72;
export const TRACK_WIDTH = 44;
export const COLUMN_WIDTH = 140;
export const COLUMN_GAP = 40;
export const CANVAS_PAD_X = 48;
export const CANVAS_PAD_Y = 24;

export const BASE_CURRENT_DAY_INDEX = 18; // Thursday, Week 39

export const getColLeft = (idx) => CANVAS_PAD_X + idx * (COLUMN_WIDTH + COLUMN_GAP);

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const TIMELINE_DAYS = Array.from({ length: 28 }, (_, i) => {
  const dayNum = 6 + i;
  const dateStr = `${String(dayNum).padStart(2, '0')}/09`;
  const weekNum = 37 + Math.floor(i / 7);
  const isSunday = i % 7 === 0;
  return {
    dayIndex: i,
    dayName: DAY_NAMES[i % 7],
    dateStr,
    weekNum,
    isSunday,
  };
});

const STORAGE_TASKS_KEY = 'flow_tracker_tasks_v4';
const STORAGE_HABITS_KEY = 'flow_tracker_habits_v4';
const STORAGE_REVISIONS_KEY = 'flow_tracker_revisions_v4';

export const INITIAL_HABITS = [
  { 
    id: 'habit-code', 
    label: 'CODE', 
    hex: '#22d3ee', 
    nameHistory: [{ title: 'CODE', at: '2026-09-06' }],
    data: [1, 1, 1, 1, 1, 0, 0,  1, 1, 1, 1, 0, 1, 1,  1, 1, 1, 1, 1, 0, 0,  0, 0, 0, 0, 0, 0, 0] 
  },
  { 
    id: 'habit-gym', 
    label: 'GYM', 
    hex: '#fb7185', 
    nameHistory: [{ title: 'GYM', at: '2026-09-06' }],
    data: [0, 1, 0, 1, 1, 0, 0,  0, 1, 0, 1, 1, 0, 0,  0, 1, 0, 1, 1, 0, 0,  0, 0, 0, 0, 0, 0, 0] 
  },
  { 
    id: 'habit-diet', 
    label: 'DIET', 
    hex: '#34d399', 
    nameHistory: [{ title: 'DIET', at: '2026-09-06' }],
    data: [1, 1, 1, 1, 1, 1, 0,  1, 1, 1, 1, 1, 1, 0,  1, 1, 1, 0, 1, 0, 0,  0, 0, 0, 0, 0, 0, 0] 
  }
];

export const INITIAL_TASKS = [
  {
    id: 'col-2d-anim',
    title: '2D Animation',
    hex: '#34d399',
    streak: 3,
    isArchived: false,
    nameHistory: [{ title: '2D Animation', at: '2026-09-06' }],
    matrix: [
      0, 1, 1, 1, 0, 0, 0,
      0, 1, 1, 1, 0, 0, 0,
      0, 1, 1, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0
    ],
  },
  {
    id: 'col-motor-design',
    title: 'Motor Design',
    hex: '#818cf8',
    streak: 0,
    isArchived: false,
    nameHistory: [{ title: 'Motor Design', at: '2026-09-06' }],
    matrix: new Array(28).fill(0),
  },
  {
    id: 'col-3d-anim',
    title: '3D Animation',
    hex: '#fbbf24',
    streak: 5,
    isArchived: false,
    nameHistory: [
      { title: '3D Modeling', at: '2026-09-08' },
      { title: '3D Animation', at: '2026-09-14' }
    ],
    matrix: [
      1, 1, 0, 0, 1, 1, 0,
      1, 1, 0, 0, 1, 1, 0,
      0, 0, 0, 1, 2, 0, 0,
      0, 0, 0, 0, 0, 0, 0
    ],
  },
];

export function generateSafeId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function sanitizeTask(t) {
  return {
    ...t,
    id: t.id || generateSafeId('col'),
    title: t.title || 'Untitled',
    hex: t.hex || '#34d399',
    streak: typeof t.streak === 'number' ? t.streak : 0,
    isArchived: Boolean(t.isArchived),
    nameHistory: Array.isArray(t.nameHistory) ? t.nameHistory : [{ title: t.title || 'Init', at: 'Init' }],
    matrix: Array.isArray(t.matrix) ? t.matrix : new Array(28).fill(0),
  };
}

export function sanitizeHabit(h) {
  return {
    ...h,
    id: h.id || generateSafeId('habit'),
    label: (h.label || 'HABIT').substring(0, 8).toUpperCase(),
    hex: h.hex || '#22d3ee',
    nameHistory: Array.isArray(h.nameHistory) ? h.nameHistory : [{ title: h.label || 'Init', at: 'Init' }],
    data: Array.isArray(h.data) ? h.data : new Array(28).fill(0),
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
  return INITIAL_TASKS;
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
  return INITIAL_HABITS;
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

export function parseHabitBlocks(habitData) {
  const blocks = [];
  let start = null;
  let len = 0;

  for (let i = 0; i < habitData.length; i++) {
    if (habitData[i] === 1) {
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

export function parseTaskMatrix(task, currentDay) {
  const blocks = [];
  let blockStart = null;
  let blockLen = 0;
  let hasActive = false;

  for (let i = 0; i < task.matrix.length; i++) {
    const val = task.matrix[i];
    if (val > 0) {
      if (blockStart === null) blockStart = i;
      blockLen++;
      if (val === 2) hasActive = true;
    } else {
      if (blockStart !== null) {
        blocks.push({ start: blockStart, days: blockLen, isActive: hasActive });
        blockStart = null;
        blockLen = 0;
        hasActive = false;
      }
    }
  }
  if (blockStart !== null) {
    blocks.push({ start: blockStart, days: blockLen, isActive: hasActive });
  }

  const cords = [];
  if (blocks.length > 0) {
    if (task.streak > 0 && blocks[0].start < 7) {
      cords.push({ startY: 0, endY: blocks[0].start });
    }

    for (let b = 0; b < blocks.length - 1; b++) {
      const prevEnd = blocks[b].start + blocks[b].days;
      const nextStart = blocks[b + 1].start;
      const gapLength = nextStart - prevEnd;

      if (gapLength > 0 && gapLength < 7) {
        cords.push({ startY: prevEnd, endY: nextStart });
      }
    }
  } else if (task.streak > 0 && currentDay < 7) {
    cords.push({ startY: 0, endY: currentDay });
  }

  return { blocks, cords };
}

export function executeMatrixAction(tasks, taskId, action, currentDay) {
  return tasks.map((task) => {
    if (task.id !== taskId) return task;

    const nextMatrix = [...task.matrix];
    const todayVal = nextMatrix[currentDay];

    if (action === 'START') {
      if (todayVal === 0) nextMatrix[currentDay] = 2;
    } else if (action === 'STOP') {
      if (todayVal === 2) nextMatrix[currentDay] = 1;
    } else if (action === 'UNDO') {
      nextMatrix[currentDay] = 0;
    }

    return { ...task, matrix: nextMatrix };
  });
}

export function shiftCurrentDay(tasks, fromDay, toDay) {
  if (toDay > fromDay) {
    return tasks.map((task) => {
      const nextMatrix = [...task.matrix];
      for (let day = fromDay; day < toDay; day++) {
        if (nextMatrix[day] === 2) {
          nextMatrix[day] = 1;
          nextMatrix[day + 1] = 2;
        }
      }
      return { ...task, matrix: nextMatrix };
    });
  }
  return tasks;
}

export function toggleHabitToday(habits, habitId, dayIndex, currentDay) {
  if (dayIndex !== currentDay) return habits;

  return habits.map((h) => {
    if (h.id !== habitId) return h;
    const nextData = [...h.data];
    nextData[dayIndex] = nextData[dayIndex] ? 0 : 1;
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
      nameHistory: [...history, { title: trimmed, at: new Date().toISOString().split('T')[0] }]
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
      nameHistory: [...history, { title: trimmed, at: new Date().toISOString().split('T')[0] }]
    };
  });
}

export function updateTaskColor(tasks, taskId, newHex) {
  return tasks.map((t) => (t.id === taskId ? { ...t, hex: newHex } : t));
}

export function insertNewTask(tasks, { title, hex, position }, totalDays) {
  const newTask = {
    id: generateSafeId('col'),
    title: title.trim().substring(0, 16),
    hex: hex || '#34d399',
    streak: 0,
    isArchived: false,
    nameHistory: [{ title: title.trim(), at: new Date().toISOString().split('T')[0] }],
    matrix: new Array(totalDays).fill(0),
  };

  const copy = [...tasks];
  const targetIndex = Math.max(0, Math.min(position - 1, copy.length));
  copy.splice(targetIndex, 0, newTask);
  return copy;
}

export function insertNewHabit(habits, { label, hex, position }, totalDays) {
  const newHabit = {
    id: generateSafeId('habit'),
    label: label.trim().substring(0, 8).toUpperCase(),
    hex: hex || '#22d3ee',
    nameHistory: [{ title: label.trim().substring(0, 8).toUpperCase(), at: new Date().toISOString().split('T')[0] }],
    data: new Array(totalDays).fill(0),
  };

  const copy = [...habits];
  const targetIndex = Math.max(0, Math.min(position - 1, copy.length));
  copy.splice(targetIndex, 0, newHabit);
  return copy;
}