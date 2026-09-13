import { useEffect, useState } from "react";

// Owns the turn animation and nothing else: it keeps the outgoing sheet
// mounted for the length of the turn so both sheets move at once, and remounts
// the incoming one so its animation restarts on every turn.
//
// It stores only which page is on its way out, and asks `renderPage` to draw
// it - never a snapshot of the markup, so a sheet mid-turn can't show a stale
// copy of a list that has since been filtered.
//
// Which page is showing, how many there are, and what goes on them all stay
// with the caller, so replacing this slide with a real 3D page-turn means
// editing this file and its keyframes and nothing about the pagination.
export default function PageTurn({ pageKey, direction = "next", durationMs = 400, renderPage }) {
  const [shown, setShown] = useState(pageKey);
  const [leavingKey, setLeavingKey] = useState(null);

  // Adjusting state during render rather than in an effect: React re-runs this
  // render immediately, with no extra pass and nothing painted in between.
  if (shown !== pageKey) {
    setShown(pageKey);
    setLeavingKey(shown);
  }

  useEffect(() => {
    if (leavingKey === null) return undefined;
    const timer = setTimeout(() => setLeavingKey(null), durationMs);
    return () => clearTimeout(timer);
  }, [leavingKey, durationMs]);

  return (
    <div
      className="page-turn"
      data-direction={direction}
      style={{ "--turn-ms": `${durationMs}ms` }}
    >
      {leavingKey !== null && (
        <div className="page-turn-sheet is-leaving" key={`out-${leavingKey}`} inert>
          {renderPage(leavingKey)}
        </div>
      )}

      <div className="page-turn-sheet is-entering" key={`in-${pageKey}`}>
        {renderPage(pageKey)}
      </div>
    </div>
  );
}
