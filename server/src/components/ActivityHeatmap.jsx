import { useEffect, useRef, useState } from "react";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKS = 53; // a full year back from today

// Local calendar date, not UTC: toISOString() would shift "today" onto the
// wrong grid cell for anyone east of UTC (a find logged this morning would
// key to yesterday's UTC date and never match the "today" cell).
function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Builds WEEKS*7 day cells ending today, grouped into weeks (Sunday-first
// columns) so it reads left-to-right like a GitHub-style contribution graph.
function buildWeeks(countsByDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Anchor on *this* week's Sunday first, then step back full weeks - doing
  // it the other way (back up a fixed day-count, then round to Sunday)
  // shrinks the range without extending it, silently dropping today off
  // the end of the grid whenever today isn't itself a Sunday.
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - (WEEKS - 1) * 7);

  const days = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const date = new Date(start.getTime() + i * MS_PER_DAY);
    const key = dateKey(date);
    days.push({ key, date, count: countsByDay[key] || 0, inRange: date <= today });
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function levelFor(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}

function describe(day) {
  const when = day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${when} · ${day.count} ${day.count === 1 ? "find" : "finds"}`;
}

// items: HeritageItem[] with a time_taken unix-seconds field.
export default function ActivityHeatmap({ items }) {
  const [active, setActive] = useState(null);
  const scroller = useRef(null);

  // A year doesn't fit a phone, so the grid scrolls - and it should open on
  // this week rather than on last autumn.
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, []);

  const countsByDay = {};
  for (const item of items) {
    if (!item.time_taken) continue;
    const key = dateKey(new Date(item.time_taken * 1000));
    countsByDay[key] = (countsByDay[key] || 0) + 1;
  }

  const weeks = buildWeeks(countsByDay);

  return (
    <div className="heatmap">
      {/* A readout rather than a floating tooltip: the grid scrolls sideways
          on a phone, and anything positioned over a cell gets clipped by that
          scroll container. This also gives touch somewhere to show up. */}
      <p className="heatmap-readout" role="status">
        {active ? describe(active) : "Tap a day to see what you logged"}
      </p>

      <div className="heatmap-scroll" ref={scroller}>
        <div className="heatmap-grid">
        {weeks.map((week, weekIndex) => (
          <div className="heatmap-col" key={weekIndex}>
            {week.map((day) =>
              day.inRange ? (
                <button
                  key={day.key}
                  type="button"
                  className={`heatmap-cell level-${levelFor(day.count)} ${
                    active?.key === day.key ? "is-active" : ""
                  }`}
                  title={describe(day)}
                  aria-label={describe(day)}
                  onPointerEnter={() => setActive(day)}
                  onPointerLeave={() => setActive((current) => (current?.key === day.key ? null : current))}
                  onFocus={() => setActive(day)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(day)}
                />
              ) : (
                <span key={day.key} className="heatmap-cell level-empty" aria-hidden="true" />
              )
            )}
          </div>
          ))}
        </div>
      </div>
    </div>
  );
}
