export const ROW_HEIGHT = 72;
export const TRACK_WIDTH = 44;
export const COLUMN_WIDTH = 140;
export const COLUMN_GAP = 40;
export const CANVAS_PAD_X = 48;
export const CANVAS_PAD_Y = 24;

export const CURRENT_DAY_INDEX = 4; // Thursday

export const getColLeft = (idx) => CANVAS_PAD_X + idx * (COLUMN_WIDTH + COLUMN_GAP);

export const WEEK_DAYS = [
  { dayIndex: 0, dayName: 'SUN', dateStr: '20/09' },
  { dayIndex: 1, dayName: 'MON', dateStr: '21/09' },
  { dayIndex: 2, dayName: 'TUE', dateStr: '22/09' },
  { dayIndex: 3, dayName: 'WED', dateStr: '23/09' },
  { dayIndex: 4, dayName: 'THU', dateStr: '24/09', isToday: true },
  { dayIndex: 5, dayName: 'FRI', dateStr: '25/09' },
  { dayIndex: 6, dayName: 'SAT', dateStr: '26/09' },
];

export const INITIAL_HABITS = [
  { id: 'code', label: 'CODE', color: 'bg-cyan-400', hex: '#22d3ee', data: [1, 1, 1, 1, 1, 0, 0] },
  { id: 'gym', label: 'GYM', color: 'bg-rose-400', hex: '#fb7185', data: [0, 1, 0, 1, 1, 0, 0] },
  { id: 'diet', label: 'DIET', color: 'bg-emerald-400', hex: '#34d399', data: [1, 1, 1, 0, 1, 0, 0] }
];

// MATRIX: 0 = Empty, 1 = Completed/Frozen, 2 = Active Today
export const INITIAL_TASKS = [
  {
    id: 'col-1',
    title: '2D Animation',
    colorClass: 'bg-emerald-400',
    hex: '#34d399',
    streak: 3,
    matrix: [0, 1, 1, 0, 0, 0, 0], // Mon-Tue completed
  },
  {
    id: 'col-2',
    title: 'Motor Design',
    colorClass: 'bg-indigo-400',
    hex: '#818cf8',
    streak: 0,
    matrix: [0, 0, 0, 0, 0, 0, 0], // Clean track
  },
  {
    id: 'col-3',
    title: '3D Animation',
    colorClass: 'bg-amber-400',
    hex: '#fbbf24',
    streak: 5,
    matrix: [0, 0, 0, 1, 2, 0, 0], // Wed completed, Thu active
  },
];

export const TASK_COLORS = [
  { class: 'bg-blue-400', hex: '#60a5fa' },
  { class: 'bg-purple-400', hex: '#c084fc' },
  { class: 'bg-pink-400', hex: '#f472b6' },
  { class: 'bg-orange-400', hex: '#fb923c' }
];

// --- DERIVATION ENGINE: Parses Matrix into Blocks & Umbilicals ---
export function parseTaskMatrix(task) {
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

  // Derive cords
  const cords = [];
  if (blocks.length > 0) {
    // Umbilical from previous week streak
    if (task.streak > 0) {
      cords.push({ startY: 0, endY: blocks[0].start });
    }
    // Gaps between segments within the current week
    for (let b = 0; b < blocks.length - 1; b++) {
      const prevEnd = blocks[b].start + blocks[b].days;
      const nextStart = blocks[b + 1].start;
      if (nextStart > prevEnd) {
        cords.push({ startY: prevEnd, endY: nextStart });
      }
    }
  } else if (task.streak > 0) {
    // Has a streak but no blocks yet this week
    cords.push({ startY: 0, endY: CURRENT_DAY_INDEX });
  }

  return { blocks, cords };
}

// --- MATRIX ACTION ENGINES ---
export function executeMatrixAction(tasks, taskId, action) {
  return tasks.map((task) => {
    if (task.id !== taskId) return task;

    const nextMatrix = [...task.matrix];
    const todayVal = nextMatrix[CURRENT_DAY_INDEX];

    if (action === 'START') {
      if (todayVal === 0) {
        nextMatrix[CURRENT_DAY_INDEX] = 2; // Set active today
      }
    } else if (action === 'STOP') {
      if (todayVal === 2) {
        nextMatrix[CURRENT_DAY_INDEX] = 1; // Freeze/stop today
      }
    } else if (action === 'UNDO') {
      // Clear today back to empty regardless of whether it was active or stopped
      nextMatrix[CURRENT_DAY_INDEX] = 0;
    }

    return { ...task, matrix: nextMatrix };
  });
}

export function toggleHabitToday(habits, habitId, dayIndex) {
  if (dayIndex !== CURRENT_DAY_INDEX) return habits;

  return habits.map((h) => {
    if (h.id !== habitId) return h;
    const nextData = [...h.data];
    nextData[dayIndex] = nextData[dayIndex] ? 0 : 1;
    return { ...h, data: nextData };
  });
}
export function reconcileDayRollover(tasks, previousDayIndex, newDayIndex) {
  if (previousDayIndex >= newDayIndex) return tasks;

  return tasks.map((task) => {
    const nextMatrix = [...task.matrix];
    // If yesterday was left running (state 2), freeze it into completed history (state 1)
    if (nextMatrix[previousDayIndex] === 2) {
      nextMatrix[previousDayIndex] = 1;
    }
    // New day begins empty (state 0) by default
    return { ...task, matrix: nextMatrix };
  });
}

export function createNewTask(tasks, title) {
  const colorObj = TASK_COLORS[tasks.length % TASK_COLORS.length];
  return [
    ...tasks,
    {
      id: `col-${Date.now()}`,
      title: title.substring(0, 12),
      colorClass: colorObj.class,
      hex: colorObj.hex,
      streak: 0,
      matrix: [0, 0, 0, 0, 0, 0, 0],
    },
  ];
}