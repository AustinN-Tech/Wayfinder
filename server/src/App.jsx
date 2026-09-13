import { Routes, Route, Navigate, useLocation } from "react-router";
import Feed from "./pages/Feed";
import Map from "./pages/Map";
import JournalShell from "./components/JournalShell";
import Camera from "./pages/Camera";
import Result from "./pages/Result";
import Entry from "./pages/Entry";
import CategoryEntries from "./pages/CategoryEntries";
import "./App.css";

function App() {
  const location = useLocation();

  const routes = (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/feed" element={<Feed />} />
      <Route path="/map" element={<Map />} />
      <Route path="/camera" element={<Camera />} />
      <Route path="/result" element={<Result />} />
      <Route path="/entry/:id" element={<Entry />} />
      <Route path="/feed/:category/:subCategory" element={<CategoryEntries />} />
    </Routes>
  );

  // the viewfinder is full-bleed; every other route is a page of the journal
  if (location.pathname === "/camera") {
    return routes;
  }

  return <JournalShell>{routes}</JournalShell>;
}

export default App;
