import { NavLink } from "react-router";
import { House, Newspaper, Map, Camera } from "lucide-react";
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
          <House size={22} />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/feed"
          className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
        >
          <Newspaper size={22} />
          <span>Feed</span>
        </NavLink>
      </div>

      <NavLink to="/camera" className="camera-tab" aria-label="Open camera">
        <Camera size={27} />
      </NavLink>

      <div className="nav-right">
        <NavLink
          to="/map"
          className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
        >
          <Map size={22} />
          <span>Map</span>
        </NavLink>
      </div>
    </nav>
  );
}