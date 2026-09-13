import { useEffect, useRef, useState } from "react";

// A fixed, hand-picked stagger (not random) so re-renders don't jitter the
// layout - "a degree or two each way", never enough to look messy.
const TILTS = [-1.4, 1.1, -0.8, 1.6, -1.2, 0.9, -1.5];

function progressText(achievement) {
  const { name, unlocked, unlockedAt, progress } = achievement;
  if (unlocked) {
    return unlockedAt ? `${name} · Unlocked (${unlockedAt})` : `${name} · Unlocked`;
  }
  const { current, target, unit } = progress;
  return `${name} · ${current} / ${target} ${unit}`;
}

// Anything started shows a sliver, so 1 of 50 still reads as begun rather
// than as an empty trough.
function fillPercent({ current, target }) {
  if (!target || current <= 0) return 0;
  return Math.min(100, Math.max(6, Math.round((current / target) * 100)));
}

function StampSlot({ achievement, tilt }) {
  const [open, setOpen] = useState(false);
  const slotRef = useRef(null);

  // Touch has no hover, so tapping toggles the tooltip instead; tapping
  // anywhere else closes it, so they don't pile up open on a phone.
  useEffect(() => {
    if (!open) return undefined;

    function handleOutside(event) {
      if (slotRef.current && !slotRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  const { name, image, unlocked } = achievement;
  const label = `${name}: ${progressText(achievement)}`;

  return (
    <li
      ref={slotRef}
      className={`stamp-slot ${unlocked ? "unlocked" : "locked"} ${open ? "open" : ""}`}
      style={{ "--tilt": `${tilt}deg` }}
    >
      <button
        type="button"
        className="stamp-trigger"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-label={label}
      >
        <img className="stamp-image" src={image} alt="" loading="lazy" />
      </button>

      <span className="stamp-tooltip" role="tooltip">
        <span className="stamp-tooltip-name">{achievement.name}</span>

        {unlocked ? (
          <span className="stamp-tooltip-note">
            {achievement.unlockedAt ? `Unlocked ${achievement.unlockedAt}` : "Unlocked"}
          </span>
        ) : (
          <>
            <span className="stamp-progress">
              <span
                className="stamp-progress-fill"
                style={{
                  width: `${fillPercent(achievement.progress)}%`,
                  background: achievement.ink,
                }}
              />
            </span>
            <span className="stamp-tooltip-note">
              {achievement.progress.current} of {achievement.progress.target}{" "}
              {achievement.progress.unit}
            </span>
          </>
        )}
      </span>
    </li>
  );
}

// achievements: [{ id, name, image, unlocked, progress: { current, target, unit } }]
export default function StampAlbum({ achievements }) {
  return (
    <ul className="stamp-grid">
      {achievements.map((achievement, index) => (
        <StampSlot
          key={achievement.id}
          achievement={achievement}
          tilt={TILTS[index % TILTS.length]}
        />
      ))}
    </ul>
  );
}
