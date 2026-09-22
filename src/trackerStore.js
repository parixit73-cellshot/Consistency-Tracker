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

export const INITIAL_HABITS = [
  { 
    id: 'code', label: 'CODE', color: 'bg-cyan-400', hex: '#22d3ee', 
    data: [1, 1, 1, 1, 1, 0, 0,  1, 1, 1, 1, 0, 1, 1,  1, 1, 1, 1, 1, 0, 0,  0, 0, 0, 0, 0, 0, 0] 
  },
  { 
    id: 'gym', label: 'GYM', color: 'bg-rose-400', hex: '#fb7185', 
    data: [0, 1, 0, 1, 1, 0, 0,  0, 1, 0, 1, 1, 0, 0,  0, 1, 0, 1, 1, 0, 0,  0, 0, 0, 0, 0, 0, 0] 
  },
  { 
    id: 'diet', label: 'DIET', color: 'bg-emerald-400', hex: '#34d399', 
    data: [1, 1, 1, 1, 1, 1, 0,  1, 1, 1, 1, 1, 1, 0,  1, 1, 1, 0, 1, 0, 0,  0, 0, 0, 0, 0, 0, 0] 
  }
];

export const INITIAL_TASKS = [
  {
    id: 'col-1',
    title: '2D Animation',
    colorClass: 'bg-emerald-400',
    hex: '#34d399',
    streak: 3,
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
    colorClass: 'bg-indigo-400',
    hex: '#818cf8',
    streak: 0,
    matrix: new Array(28).fill(0),
  },
  {
    id: 'col-3',
    title: '3D Animation',
    colorClass: 'bg-amber-400',
    hex: '#fbbf24',
    streak: 5,
    matrix: [
      1, 1, 0, 0, 1, 1, 0,
      1, 1, 0, 0, 1, 1, 0,
      0, 0, 0, 1, 2, 0, 0,
      0, 0, 0, 0, 0, 0, 0
    ],
  },
];

export const TASK_COLORS = [
  { class: 'bg-blue-400', hex: '#60a5fa' },
  { class: 'bg-purple-400', hex: '#c084fc' },
  { class: 'bg-pink-400', hex: '#f472b6' },
  { class: 'bg-orange-400', hex: '#fb923c' },
  { class: 'bg-teal-400', hex: '#2dd4bf' }
];

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
      if (todayVal === 0) {
        nextMatrix[currentDay] = 2;
      }
    } else if (action === 'STOP') {
      if (todayVal === 2) {
        nextMatrix[currentDay] = 1;
      }
    } else if (action === 'UNDO') {
      nextMatrix[currentDay] = 0;
    }

    return { ...task, matrix: nextMatrix };
  });
}

// Active tasks bleed forward into the new day; ended ones remain frozen
export function shiftCurrentDay(tasks, fromDay, toDay) {
  if (toDay > fromDay) {
    return tasks.map((task) => {
      const nextMatrix = [...task.matrix];
      for (let day = fromDay; day < toDay; day++) {
        if (nextMatrix[day] === 2) {
          nextMatrix[day] = 1; // solidify past
          nextMatrix[day + 1] = 2; // flow down into the new active day
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

export function createNewTask(tasks, title, totalDays) {
  const colorObj = TASK_COLORS[tasks.length % TASK_COLORS.length];
  return [
    ...tasks,
    {
      id: `col-${Date.now()}`,
      title: title.trim().substring(0, 14),
      colorClass: colorObj.class,
      hex: colorObj.hex,
      streak: 0,
      matrix: new Array(totalDays).fill(0),
    },
  ];
}