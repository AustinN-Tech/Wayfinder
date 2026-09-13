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

// Builds WEEKS*7 day cells as a rolling window ending today (not aligned to
// calendar Sun-Sat weeks) - a calendar-aligned grid leaves the newest column
// mostly empty whenever today isn't a Saturday, which looks like a single
// square floating alone with nothing below it. A rolling window means the
// last column is always 7 real, already-happened days, so it's never
// disconnected from the rest of the grid.
function buildWeeks(countsByDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays = WEEKS * 7;
  const start = new Date(today.getTime() - (totalDays - 1) * MS_PER_DAY);

  const days = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(start.getTime() + i * MS_PER_DAY);
    const key = dateKey(date);
    days.push({ key, count: countsByDay[key] || 0 });
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
                className={`heatmap-cell level-${levelFor(day.count)}`}
                title={`${day.count} find${day.count === 1 ? "" : "s"} on ${day.key}`}
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
