import { Routes, Route, useLocation } from "react-router";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Map from "./pages/Map";
import JournalShell from "./components/JournalShell";
import Camera from "./pages/Camera";
import Result from "./pages/Result";
import "./App.css";

function App() {
  const location = useLocation();

  const routes = (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/feed" element={<Feed />} />
      <Route path="/map" element={<Map />} />
      <Route path="/camera" element={<Camera />} />
      <Route path="/result" element={<Result />} />
    </Routes>
  );

  // the viewfinder is full-bleed; every other route is a page of the journal
  if (location.pathname === "/camera") {
    return routes;
  }

  return <JournalShell>{routes}</JournalShell>;
}

export default App;
