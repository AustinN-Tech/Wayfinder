import { useEffect, useState } from "react";
import { fetchImageBlob } from "../lib/api";

// A plain <img src={imageUrl}> can't attach the auth header the images
// route requires, so this fetches the bytes itself and swaps in an
// object URL once they arrive.
export default function AuthImage({ path, alt = "", className, loading }) {
  const [src, setSrc] = useState(null);
  // Which path `src` was fetched for - lets render treat a stale blob URL
  // (left over from the previous `path`) as absent, without needing a
  // synchronous setSrc(null) inside the effect to clear it first.
  const [loadedFor, setLoadedFor] = useState(null);

  useEffect(() => {
    if (!path) return undefined;

    let objectUrl;
    let cancelled = false;

    fetchImageBlob(path)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setLoadedFor(path);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  const currentSrc = loadedFor === path ? src : null;
  if (!currentSrc) return null;
  return <img src={currentSrc} alt={alt} className={className} loading={loading} />;
}
