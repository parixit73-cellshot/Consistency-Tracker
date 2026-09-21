import React, { useState } from 'react';
import { 
  Pin, 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

const INITIAL_PROJECTS = [
  { id: 'p1', name: 'Design Overhaul', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'p2', name: 'Auth & DB Schema', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { id: 'p3', name: 'Tauri Desktop Wrapper', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
];

const INITIAL_TASKS = [
  {
    id: 't1',
    projectId: 'p1',
    title: 'Finalize Wireframes',
    startDate: '2026-09-21',
    endDate: '2026-09-23',
    pinned: true,
    notes: 'Verify desktop responsiveness and dark theme palette before styling columns.',
    status: 'in-progress'
  },
  {
    id: 't2',
    projectId: 'p2',
    title: 'JWT Session Flow',
    startDate: '2026-09-22',
    endDate: '2026-09-24',
    pinned: false,
    notes: 'Check token storage strategy within local SQLite DB.',
    status: 'pending'
  },
  {
    id: 't3',
    projectId: 'p3',
    title: 'Initialize Tauri Scaffold',
    startDate: '2026-09-24',
    endDate: '2026-09-26',
    pinned: true,
    notes: 'Audit Rust dependencies and test window framing.',
    status: 'pending'
  }
];

// Generate a two-week date window
const generateDates = () => {
  const dates = [];
  const base = new Date(2026, 8, 21); // Sept 21, 2026
  for (let i = 0; i < 12; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dates.push({
      iso: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: i === 0
    });
  }
  return dates;
};

export default function App() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [projects] = useState(INITIAL_PROJECTS);
  const [expandedNotes, setExpandedNotes] = useState({ t1: true });
  const dates = generateDates();

  const togglePin = (taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, pinned: !t.pinned } : t));
  };

  const toggleNotes = (taskId) => {
    setExpandedNotes(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  return (
    <div className="flex h-screen w-screen bg-neutral-950 text-neutral-100 font-sans select-none overflow-hidden">
      {/* Sidebar: Pinned & High Priority */}
      <aside className="w-72 border-r border-neutral-800/80 bg-neutral-900/40 p-4 flex flex-col gap-4 flex-shrink-0">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2 font-semibold tracking-wide">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <span>Timeline Tracker</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">v0.1</span>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            <Pin className="w-3.5 h-3.5" />
            <span>Pinned Tasks</span>
          </div>
          <div className="flex flex-col gap-2">
            {tasks.filter(t => t.pinned).map(task => {
              const project = projects.find(p => p.id === task.projectId);
              return (
                <div key={task.id} className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{task.title}</span>
                    <button onClick={() => togglePin(task.id)} className="text-amber-400 hover:text-amber-300">
                      <Pin className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span className={`px-1.5 py-0.5 rounded border ${project?.color}`}>{project?.name}</span>
                    <span>{task.startDate.slice(5)} → {task.endDate.slice(5)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Timeline Grid */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Project Header Bar */}
        <div className="h-14 border-b border-neutral-800 bg-neutral-900/60 flex items-center pl-28 pr-6">
          <div className="grid grid-cols-3 w-full gap-4">
            {projects.map(proj => (
              <div key={proj.id} className="flex items-center justify-between px-3 py-1.5 rounded-md border border-neutral-800 bg-neutral-900/80">
                <span className="text-sm font-medium">{proj.name}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Timeline Canvas */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="relative flex min-h-full">
            {/* Vertical Dates Column */}
            <div className="w-28 flex flex-col border-r border-neutral-800 bg-neutral-950/80 sticky left-0 z-20">
              {dates.map(date => (
                <div 
                  key={date.iso} 
                  className={`h-24 flex flex-col justify-center px-4 border-b border-neutral-800/60 ${
                    date.isToday ? 'bg-emerald-950/20' : ''
                  }`}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-bold ${date.isToday ? 'text-emerald-400' : 'text-neutral-200'}`}>
                      {date.dayNum}
                    </span>
                    <span className="text-xs uppercase text-neutral-400">{date.month}</span>
                  </div>
                  <span className="text-[11px] text-neutral-400">{date.dayName}</span>
                </div>
              ))}
            </div>

            {/* Columns & Task Cards */}
            <div className="flex-1 grid grid-cols-3 gap-4 p-4 relative">
              {projects.map(project => {
                const projectTasks = tasks.filter(t => t.projectId === project.id);
                return (
                  <div key={project.id} className="relative flex flex-col gap-3">
                    {projectTasks.map(task => {
                      const isExpanded = !!expandedNotes[task.id];
                      return (
                        <div 
                          key={task.id} 
                          className={`rounded-xl border p-3 bg-neutral-900/90 shadow-lg backdrop-blur flex flex-col gap-2 transition-all ${project.color}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-sm leading-snug">{task.title}</span>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => togglePin(task.id)}
                                className="p-1 text-neutral-400 hover:text-amber-400 transition-colors"
                              >
                                <Pin className={`w-3.5 h-3.5 ${task.pinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-neutral-300">
                            <Clock className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{task.startDate} to {task.endDate}</span>
                          </div>

                          {/* Collapsible Notes Area */}
                          <div className="border-t border-neutral-800/60 pt-2 mt-1">
                            <button 
                              onClick={() => toggleNotes(task.id)}
                              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              <span>Notes</span>
                            </button>
                            {isExpanded && (
                              <p className="text-xs text-neutral-300 mt-1.5 pl-4 border-l-2 border-neutral-700 leading-relaxed font-mono">
                                {task.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}