import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
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
      <PageHeader
        title="Stamps"
        accent="#6b4a7d"
        note={
          achievements
            ? `${achievements.filter((stamp) => stamp.unlocked).length} of ${achievements.length} earned`
            : undefined
        }
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!achievements && !errorMessage && <p>Opening your journal...</p>}
      {achievements && <StampAlbum achievements={achievements} />}
    </main>
  );
}
