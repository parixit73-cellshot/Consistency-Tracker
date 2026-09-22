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
  return {
    dayIndex: i,
    dayName: DAY_NAMES[i % 7],
    dateStr,
    weekNum,
  };
});

// Storage Keys
const STORAGE_TASKS_KEY = 'flow_tracker_tasks_v2';
const STORAGE_HABITS_KEY = 'flow_tracker_habits_v2';

export const INITIAL_HABITS = [
  { 
    id: 'habit-1', label: 'CODE', hex: '#22d3ee', 
    data: [1, 1, 1, 1, 1, 0, 0,  1, 1, 1, 1, 0, 1, 1,  1, 1, 1, 1, 1, 0, 0,  0, 0, 0, 0, 0, 0, 0] 
  },
  { 
    id: 'habit-2', label: 'GYM', hex: '#fb7185', 
    data: [0, 1, 0, 1, 1, 0, 0,  0, 1, 0, 1, 1, 0, 0,  0, 1, 0, 1, 1, 0, 0,  0, 0, 0, 0, 0, 0, 0] 
  },
  { 
    id: 'habit-3', label: 'DIET', hex: '#34d399', 
    data: [1, 1, 1, 1, 1, 1, 0,  1, 1, 1, 1, 1, 1, 0,  1, 1, 1, 0, 1, 0, 0,  0, 0, 0, 0, 0, 0, 0] 
  }
];

export const INITIAL_TASKS = [
  {
    id: 'col-1',
    title: '2D Animation',
    hex: '#34d399',
    streak: 3,
    isArchived: false,
    nameHistory: [{ title: '2D Animation', at: 'Init' }],
    matrix: [
      0, 1, 1, 1, 0, 0, 0,
      0, 1, 1, 1, 0, 0, 0,
      0, 1, 1, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0
    ],
  },
  {
    id: 'col-2',
    title: 'Motor Design',
    hex: '#818cf8',
    streak: 0,
    isArchived: false,
    nameHistory: [{ title: 'Motor Design', at: 'Init' }],
    matrix: new Array(28).fill(0),
  },
  {
    id: 'col-3',
    title: '3D Animation',
    hex: '#fbbf24',
    streak: 5,
    isArchived: false,
    nameHistory: [{ title: '3D Modeling', at: '2026-09-10' }, { title: '3D Animation', at: '2026-09-15' }],
    matrix: [
      1, 1, 0, 0, 1, 1, 0,
      1, 1, 0, 0, 1, 1, 0,
      0, 0, 0, 1, 2, 0, 0,
      0, 0, 0, 0, 0, 0, 0
    ],
  },
];

// Local Storage Loaders
export function loadPersistedTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_TASKS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load persisted tasks', e);
  }
  return INITIAL_TASKS;
}

export function loadPersistedHabits() {
  try {
    const saved = localStorage.getItem(STORAGE_HABITS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load persisted habits', e);
  }
  return INITIAL_HABITS;
}

export function persistState(tasks, habits) {
  try {
    localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_HABITS_KEY, JSON.stringify(habits));
  } catch (e) {
    console.error('Persistence failed', e);
  }
}

// Data Parsing Engine
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
    if (task.streak > 0) {
      cords.push({ startY: 0, endY: blocks[0].start });
    }
    for (let b = 0; b < blocks.length - 1; b++) {
      const prevEnd = blocks[b].start + blocks[b].days;
      const nextStart = blocks[b + 1].start;
      if (nextStart > prevEnd) {
        cords.push({ startY: prevEnd, endY: nextStart });
      }
    }
  } else if (task.streak > 0) {
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

// Renaming with historical audit log
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

// Insertion & Vault Restorations
export function insertNewTask(tasks, { title, hex, position }, totalDays) {
  const newTask = {
    id: `col-${Date.now()}`,
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
    id: `habit-${Date.now()}`,
    label: label.trim().substring(0, 5).toUpperCase(),
    hex: hex || '#22d3ee',
    data: new Array(totalDays).fill(0),
  };

  const copy = [...habits];
  const targetIndex = Math.max(0, Math.min(position - 1, copy.length));
  copy.splice(targetIndex, 0, newHabit);
  return copy;
}