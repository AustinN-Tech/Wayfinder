import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import StampAlbum from "./StampAlbum";

// Kept in step with .stamp-shelf-row's grid in App.css.
const STAMP_WIDTH = 172;
const GAP = 16;

// One row of stamps, paged rather than scrolled: the shelf shows as many as
// fit and an arrow appears only once there are more than that. No scroll
// container, which is also why the album's tooltip can hang below a stamp
// without being clipped.
export default function StampShelf({ achievements }) {
  const row = useRef(null);
  const [perRow, setPerRow] = useState(1);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const element = row.current;
    if (!element) return undefined;

    // fires once on observe, which sets the initial value - measuring
    // synchronously here would be a setState inside the effect body
    const observer = new ResizeObserver(() => {
      const width = element.clientWidth;
      setPerRow(Math.max(1, Math.floor((width + GAP) / (STAMP_WIDTH + GAP))));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const pageCount = Math.max(1, Math.ceil(achievements.length / perRow));
  // a narrower window fits fewer per row, which can strand you past the end
  const current = Math.min(page, pageCount - 1);
  const shown = achievements.slice(current * perRow, current * perRow + perRow);

  return (
    <div className="stamp-shelf">
      <span className="stamp-shelf-arrow">
        {current > 0 && (
          <button
            type="button"
            className="stamp-shelf-step"
            onClick={() => setPage(current - 1)}
            aria-label="Previous stamps"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </span>

      <div className="stamp-shelf-row" ref={row}>
        <StampAlbum achievements={shown} />
      </div>

      <span className="stamp-shelf-arrow">
        {current < pageCount - 1 && (
          <button
            type="button"
            className="stamp-shelf-step"
            onClick={() => setPage(current + 1)}
            aria-label="More stamps"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </span>
    </div>
  );
}
