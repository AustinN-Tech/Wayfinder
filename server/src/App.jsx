import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Map from "./pages/Map";
import BottomTabBar from "./components/BottomTabBar";
import Camera from "./pages/Camera";
import Result from "./pages/Result";
import "./App.css";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/map" element={<Map />} />
        <Route path="/camera" element={<Camera />} />
        <Route path="/result" element={<Result />} />
      </Routes>

      <BottomTabBar />
    </>
  );
}

export default App;