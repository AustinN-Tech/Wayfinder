import { NavLink } from "react-router";
import { House, Newspaper, Map } from "lucide-react";
import "../App.css";

export default function BottomTabBar() {
  return (
    <nav className="tab-bar">
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

      <NavLink
        to="/map"
        className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
      >
        <Map size={22} />
        <span>Map</span>
      </NavLink>
    </nav>
  );
}