import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

const SCAN_DURATION_MS = 2600;

export default function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
      } catch (error) {
        console.error("Camera error:", error);
        alert("Could not access your camera. Allow camera permission and try again.");
      }
    }

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function capturePhoto() {
    if (isScanning) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;

      setIsScanning(true);
      const photoUrl = URL.createObjectURL(blob);

      setTimeout(() => {
        navigate("/result", { state: { photoUrl, photoBlob: blob } });
      }, SCAN_DURATION_MS);
    }, "image/jpeg");
  }

  return (
    <main className="camera-screen">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`camera-preview ${isScanning ? "scanning" : ""}`}
      />

      {isScanning && <div className="scan-line" aria-hidden="true" />}

      {isScanning && (
        <div className="scan-overlay" aria-hidden="true">
          <div className="scan-spinner" />
          <p className="scan-text">Scanning...</p>
        </div>
      )}

      <button
        className="capture-button"
        onClick={capturePhoto}
        disabled={isScanning}
        aria-label="Capture photo"
      />
    </main>
  );
}