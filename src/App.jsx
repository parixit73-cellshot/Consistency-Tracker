import React from 'react';

// Static UI Configuration (Single Source of Truth for Alignment)
const ROW_HEIGHT = 72; // Exact row height in pixels
const TRACKER_WIDTH = 48; // Base circle diameter in pixels
const COLUMN_WIDTH = 144; // Column width in pixels

// Pure Static Presentation Data
const DATES = [
  { offset: -3, formatted: '18/09/26' },
  { offset: -2, formatted: '19/09/26' },
  { offset: -1, formatted: '20/09/26' },
  { offset: 0, formatted: '21/09/26', isToday: true },
  { offset: 1, formatted: '22/09/26' },
  { offset: 2, formatted: '23/09/26' },
  { offset: 3, formatted: '24/09/26' }
];

const STATIC_TRACKS = [
  {
    id: 'track-1',
    title: 'Design Spec',
    startOffset: -2,
    spanDays: 2, // Ends on day 0 (Today)
    targetOffset: 0, // Target was today -> On Schedule
    color: 'bg-emerald-500 text-neutral-950',
    isDelayed: false
  },
  {
    id: 'track-2',
    title: 'Core Engine',
    startOffset: -1,
    spanDays: 3, // Spans to day 2
    targetOffset: 1, // Target was day 1 -> Overdue/Delayed
    color: 'bg-rose-500 text-neutral-950',
    isDelayed: true
  },
  {
    id: 'track-3',
    title: 'Window Native',
    startOffset: 0,
    spanDays: 1, // 1 day = Perfect Circle
    targetOffset: 0,
    color: 'bg-indigo-400 text-neutral-950',
    isDelayed: false
  },
  {
    id: 'track-4',
    title: 'Sync Pipeline',
    startOffset: 1,
    spanDays: 2,
    targetOffset: 2,
    color: 'bg-amber-400 text-neutral-950',
    isDelayed: false
  }
];

export default function App() {
  const pastDaysVisible = 3; // Center offset reference (index 3 is offset 0)

  return (
    <div className="flex h-screen w-screen bg-black text-white font-mono select-none overflow-hidden">
      
      {/* ========================================================= */}
      {/* 1. LEFT PANEL: Date Ribbon (Strict 7-Day Window)          */}
      {/* ========================================================= */}
      <aside className="w-44 h-full border-r border-neutral-900 flex flex-col justify-center px-6 shrink-0 bg-black z-20">
        <div className="flex flex-col">
          {DATES.map((d) => {
            const distance = Math.abs(d.offset);

            // Typographic scale down relative to distance from center (offset 0)
            const typographyClasses = d.isToday
              ? 'text-sm font-bold text-white scale-105 border-y-2 border-white bg-white/5 px-2'
              : distance === 1
              ? 'text-xs font-medium text-neutral-400 opacity-80 px-2'
              : distance === 2
              ? 'text-[11px] font-normal text-neutral-600 opacity-60 px-2'
              : 'text-[10px] font-light text-neutral-700 opacity-40 px-2';

            return (
              <div
                key={d.offset}
                style={{ height: `${ROW_HEIGHT}px` }}
                className="flex items-center"
              >
                <div className={`w-full py-1.5 flex items-center justify-center transition-all ${typographyClasses}`}>
                  <span>{d.formatted}</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN CANVAS: Staggered Headers & Vertical Tracks        */}
      {/* ========================================================= */}
      <main className="flex-1 h-full flex flex-col overflow-x-auto overflow-y-hidden bg-black relative">
        
        {/* TOP HEADER: Staggered Badges (Odd / Even Elevation) */}
        <div className="h-32 pt-3 px-12 border-b border-neutral-900 flex items-start shrink-0 min-w-max">
          <div className="flex gap-16">
            {STATIC_TRACKS.map((track, idx) => {
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={track.id}
                  style={{ width: `${COLUMN_WIDTH}px` }}
                  className="flex flex-col items-center relative"
                >
                  {/* Alternating Box Elevation */}
                  <div
                    className={`w-full px-3 py-2 border rounded text-xs font-bold text-center tracking-wide ${
                      isEven
                        ? 'translate-y-1 border-neutral-700 bg-neutral-950 text-neutral-200'
                        : 'translate-y-10 border-neutral-800 bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    <div className="truncate">{track.title}</div>
                  </div>

                  {/* Drop-line Umbilical to Column Track Spine */}
                  <svg
                    className="w-full absolute left-0 pointer-events-none"
                    style={{
                      top: isEven ? '40px' : '76px',
                      height: isEven ? '72px' : '36px'
                    }}
                  >
                    <line
                      x1="50%"
                      y1="0"
                      x2="50%"
                      y2="100%"
                      stroke="#404040"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                  </svg>
                </div>
              );
            })}
          </div>
        </div>

        {/* TRACKS CANVAS: Synchronized with the 7-Day Window */}
        <div className="flex-1 px-12 relative flex items-center min-w-max">
          
          {/* Subtle Horizontal Date Reference Wires */}
          <div className="absolute inset-0 flex flex-col justify-center pointer-events-none">
            {DATES.map((d) => (
              <div
                key={d.offset}
                style={{ height: `${ROW_HEIGHT}px` }}
                className={`w-full border-b ${
                  d.isToday ? 'border-neutral-800 bg-white/[0.02]' : 'border-neutral-950'
                }`}
              />
            ))}
          </div>

          {/* Vertical Track Columns */}
          <div className="flex gap-16 relative z-10">
            {STATIC_TRACKS.map((track) => {
              const visualStartIndex = pastDaysVisible + track.startOffset;
              const isCircle = track.spanDays <= 1;
              const topOffset = visualStartIndex * ROW_HEIGHT + (ROW_HEIGHT - TRACKER_WIDTH) / 2;
              
              const shapeHeight = isCircle
                ? TRACKER_WIDTH
                : TRACKER_WIDTH + (track.spanDays - 1) * ROW_HEIGHT;

              // Anticipated Deadline Target Ring Position
              const targetVisualIndex = pastDaysVisible + track.targetOffset;
              const targetTopOffset = targetVisualIndex * ROW_HEIGHT + (ROW_HEIGHT - TRACKER_WIDTH) / 2;

              return (
                <div
                  key={track.id}
                  style={{
                    width: `${COLUMN_WIDTH}px`,
                    height: `${ROW_HEIGHT * 7}px`
                  }}
                  className="relative flex justify-center"
                >
                  {/* Anticipated Target Cradle (Catches the circle upon arrival) */}
                  <div
                    style={{
                      top: `${targetTopOffset + TRACKER_WIDTH / 2}px`,
                      width: `${TRACKER_WIDTH}px`,
                      height: `${TRACKER_WIDTH / 2}px`
                    }}
                    className={`absolute rounded-b-full border-b-[5px] border-x-[5px] border-t-0 pointer-events-none transition-colors ${
                      track.isDelayed ? 'border-rose-500' : 'border-neutral-500'
                    }`}
                  />

                  {/* The Solid Morphing Shape (Circle or Stadium Pill) */}
                  <div
                    style={{
                      top: `${topOffset}px`,
                      height: `${shapeHeight}px`,
                      width: `${TRACKER_WIDTH}px`
                    }}
                    className={`absolute rounded-full flex flex-col items-center justify-between p-2 shadow-lg ${track.color}`}
                  >
                    <span className="text-[10px] font-bold tracking-wider">
                      {track.spanDays}d
                    </span>
                    <div className="w-2 h-2 rounded-full bg-neutral-950/60" />
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </main>

    </div>
  );
}