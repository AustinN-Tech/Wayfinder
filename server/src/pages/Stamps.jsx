import { useEffect, useState } from "react";
import StampAlbum from "../components/StampAlbum";
import { getAchievements } from "../lib/api";
import { toStampAchievements } from "../lib/achievements";

export default function Stamps() {
  const [achievements, setAchievements] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getAchievements()
      .then((data) => setAchievements(toStampAchievements(data)))
      .catch((err) => setErrorMessage(err.message));
  }, []);

  return (
    <main className="page-body screen">
      <h1>Stamps</h1>
      <p>Stamps earned along the way. Hover or tap a stamp to see your progress.</p>

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!achievements && !errorMessage && <p>Opening your journal...</p>}
      {achievements && <StampAlbum achievements={achievements} />}
    </main>
  );
}
