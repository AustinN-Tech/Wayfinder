import { Routes, Route } from "react-router";

function Home() {
  return <h1>InSitu</h1>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default App;