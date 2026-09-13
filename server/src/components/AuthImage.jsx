import { useEffect, useState } from "react";
import { fetchImageBlob } from "../lib/api";

// A plain <img src={imageUrl}> can't attach the auth header the images
// route requires, so this fetches the bytes itself and swaps in an
// object URL once they arrive.
export default function AuthImage({ path, alt = "", className, loading }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    setSrc(null);
    if (!path) return;

    let objectUrl;
    let cancelled = false;

    fetchImageBlob(path)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} loading={loading} />;
}
