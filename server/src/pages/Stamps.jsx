import StampAlbum from "../components/StampAlbum";
import { FAKE_ACHIEVEMENTS } from "../lib/achievements";

export default function Stamps() {
  return (
    <main className="page-body screen">
      <h1>Stamps</h1>
      <p>Stamps earned along the way. Hover or tap a stamp to see your progress.</p>
      <StampAlbum achievements={FAKE_ACHIEVEMENTS} />
    </main>
  );
}
