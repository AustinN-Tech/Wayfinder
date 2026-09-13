import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import StampAlbum from "../components/StampAlbum";
import { PostageStamp } from "../components/icons";
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
        subtitle="Earned along the way — hover or tap a stamp to see your progress."
        icon={PostageStamp}
        accent="#6b4a7d"
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!achievements && !errorMessage && <p>Opening your journal...</p>}
      {achievements && <StampAlbum achievements={achievements} />}
    </main>
  );
}
