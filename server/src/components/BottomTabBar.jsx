import { NavLink } from "react-router";
import { Camera } from "lucide-react";
import { CompassRose, OpenBook, FoldedMap } from "./icons";
import "../App.css";

export default function BottomTabBar() {
  return (
    <nav className="tab-bar">
      <div className="nav-left">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
        >
          <CompassRose size={28} />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/feed"
          className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
        >
          <OpenBook size={28} />
          <span>Feed</span>
        </NavLink>
      </div>

      <NavLink to="/camera" className="camera-tab" aria-label="Open camera">
        <Camera size={30} />
      </NavLink>

      <div className="nav-right">
        <NavLink
          to="/map"
          className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
        >
          <FoldedMap size={28} />
          <span>Map</span>
        </NavLink>
      </div>
    </nav>
  );
}