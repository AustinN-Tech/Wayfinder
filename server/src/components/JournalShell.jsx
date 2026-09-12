import { NavLink, useLocation } from "react-router";
import { Camera } from "lucide-react";
import { CompassRose, OpenBook, FoldedMap, Medal } from "./icons";

const ITEMS = [
  { to: "/", label: "Home", Icon: CompassRose, color: "#a8452f", end: true },
  { to: "/feed", label: "Entries", Icon: OpenBook, color: "#8f6518" },
  { to: "/map", label: "Map", Icon: FoldedMap, color: "#3f6b4e" },
  { label: "Awards", Icon: Medal, color: "#6b4a7d" },
  { to: "/camera", label: "New Entry", Icon: Camera, color: "#2f6b7a" },
];

function matches(item, pathname) {
  if (!item.to) return false;
  return item.end ? pathname === item.to : pathname.startsWith(item.to);
}

const BACKDROP_COUNT = 6;
const BACKDROP_STEP = 12; // seconds each image holds before the next fades up

// Slow drifting collage of public-domain landscapes, botanical plates and
// antiquities, blurred far past legibility so it reads as colour and movement.
function Backdrop() {
  return (
    <>
      <div className="backdrop" aria-hidden="true">
        {Array.from({ length: BACKDROP_COUNT }, (_, i) => (
          <div
            key={i}
            className="backdrop-slide"
            style={{
              backgroundImage: `url(/backdrop/backdrop-${i + 1}.jpg)`,
              animationDelay: `${i * BACKDROP_STEP}s`,
            }}
          />
        ))}
      </div>
      <div className="backdrop-wash" aria-hidden="true" />
    </>
  );
}

export default function JournalShell({ children }) {
  const { pathname } = useLocation();
  const activeIndex = ITEMS.findIndex((item) => matches(item, pathname));

  return (
    <div className="desk">
      <Backdrop />
      <div className="journal">
        <nav className="bookmarks" aria-label="Journal sections">
          {ITEMS.map((item, index) => {
            const { to, label, Icon, color, end } = item;
            const active = index === activeIndex;

            // Each tab overlaps the one before it, so what stays visible of a
            // closed tab is its left edge, where the icon sits.
            const style = {
              "--tab": color,
              zIndex: index + 1,
            };
            const className = `bookmark ${active ? "active" : ""}`;
            const content = (
              <>
                <Icon size={18} />
                <span>{label}</span>
              </>
            );

            return to ? (
              <NavLink
                key={label}
                to={to}
                end={end}
                aria-label={label}
                style={style}
                className={className}
              >
                {content}
              </NavLink>
            ) : (
              <button
                key={label}
                type="button"
                aria-label={label}
                style={style}
                className={className}
              >
                {content}
              </button>
            );
          })}
        </nav>

        <div className="page">{children}</div>
      </div>
    </div>
  );
}
