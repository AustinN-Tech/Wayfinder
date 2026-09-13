const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKS = 17; // ~4 months, enough to read on a phone without scrolling sideways

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

// items: HeritageItem[] with a time_taken unix-seconds field.
export default function ActivityHeatmap({ items }) {
  const countsByDay = {};
  for (const item of items) {
    if (!item.time_taken) continue;
    const key = dateKey(new Date(item.time_taken * 1000));
    countsByDay[key] = (countsByDay[key] || 0) + 1;
  }

  const weeks = buildWeeks(countsByDay);
  const total = items.length;

  return (
    <div className="heatmap">
      <div className="heatmap-grid">
        {weeks.map((week, weekIndex) => (
          <div className="heatmap-col" key={weekIndex}>
            {week.map((day) => (
              <div
                key={day.key}
                className={`heatmap-cell level-${day.inRange ? levelFor(day.count) : "empty"}`}
                title={day.inRange ? `${day.count} find${day.count === 1 ? "" : "s"} on ${day.key}` : ""}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="heatmap-caption">
        {total} find{total === 1 ? "" : "s"} logged in total
      </p>
    </div>
  );
}
