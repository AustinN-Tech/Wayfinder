import { Link, useLocation } from "react-router";

export default function Result() {
  const { state } = useLocation();

  return (
    <main className="result-screen">
      <h1>Your photo</h1>

      {state?.photoUrl ? (
        <img className="captured-photo" src={state.photoUrl} alt="Captured" />
      ) : (
        <p>No photo captured yet.</p>
      )}

      <Link to="/camera">Take another photo</Link>
    </main>
  );
}