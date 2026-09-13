import { NavLink, useLocation } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { Camera } from "lucide-react";
import { OpenBook, FoldedMap, PostageStamp } from "./icons";

const ITEMS = [
  { to: "/feed", label: "Entries", Icon: OpenBook, color: "#8f6518" },
  { to: "/map", label: "Map", Icon: FoldedMap, color: "#3f6b4e" },
  { to: "/stamps", label: "Stamps", Icon: PostageStamp, color: "#6b4a7d" },
];

function matches(item, pathname) {
  if (!item.to) return false;
  return item.end ? pathname === item.to : pathname.startsWith(item.to);
}

export default function JournalShell({ children }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth0();
  const activeIndex = ITEMS.findIndex((item) => matches(item, pathname));

  return (
    <div className="desk">
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

        <div className="page">
          {children}

          <div className="page-seal-row">
            <NavLink to="/camera" className="page-seal" aria-label="Capture artifact">
              <Camera size={26} />
              <span className="page-seal-label">Capture Artifact</span>
            </NavLink>
          </div>

          <p className="page-signature">
            {user?.name || user?.email}
            <button
              type="button"
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            >
              Sign out
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
