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

export const INITIAL_TASKS = [
  {
    id: 'col-1',
    title: '2D Animation',
    colorClass: 'bg-emerald-400',
    hex: '#34d399',
    streak: 3,
    segments: [{ start: 1, days: 2 }],
  },
  {
    id: 'col-2',
    title: 'Motor Design',
    colorClass: 'bg-indigo-400',
    hex: '#818cf8',
    streak: 0,
    segments: [],
  },
  {
    id: 'col-3',
    title: '3D Animation',
    colorClass: 'bg-amber-400',
    hex: '#fbbf24',
    streak: 5,
    segments: [{ start: 3, days: 2, isTodayActive: true }],
  },
];

export const TASK_COLORS = [
  { class: 'bg-blue-400', hex: '#60a5fa' },
  { class: 'bg-purple-400', hex: '#c084fc' },
  { class: 'bg-pink-400', hex: '#f472b6' },
  { class: 'bg-orange-400', hex: '#fb923c' }
];

// --- CORE APPLICATION LOGIC ENGINES ---

export function toggleHabitToday(habits, habitId, dayIndex) {
  if (dayIndex !== CURRENT_DAY_INDEX) return habits;

  return habits.map((h) => {
    if (h.id !== habitId) return h;
    const nextData = [...h.data];
    nextData[dayIndex] = nextData[dayIndex] ? 0 : 1;
    return { ...h, data: nextData };
  });
}

export function toggleTaskToday(tasks, taskId) {
  return tasks.map((task) => {
    if (task.id !== taskId) return task;

    const activeSegIdx = task.segments.findIndex(
      (s) => s.isTodayActive || (s.start <= CURRENT_DAY_INDEX && s.start + s.days > CURRENT_DAY_INDEX)
    );

    if (activeSegIdx !== -1) {
      const seg = task.segments[activeSegIdx];
      // Past day start (e.g. Wednesday): trim to freeze past time
      if (seg.start < CURRENT_DAY_INDEX) {
        const pastDays = CURRENT_DAY_INDEX - seg.start;
        const updated = [...task.segments];
        updated[activeSegIdx] = {
          start: seg.start,
          days: pastDays,
          isTodayActive: false,
        };
        return { ...task, segments: updated };
      }

      // Started today: remove today's block
      return {
        ...task,
        segments: task.segments.filter((_, idx) => idx !== activeSegIdx),
      };
    }

    // Inactive on Thursday: append a segment for today
    return {
      ...task,
      segments: [
        ...task.segments,
        { start: CURRENT_DAY_INDEX, days: 1, isTodayActive: true },
      ],
    };
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
      segments: [],
    },
  ];
}