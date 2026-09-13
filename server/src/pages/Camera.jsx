import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { X } from "lucide-react";

const SCAN_DURATION_MS = 2600;

export default function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const activeRef = useRef(false);
  const captureBusyRef = useRef(false);
  const timerRef = useRef(null);
  const previewUrlRef = useRef(null);
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    activeRef.current = true;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (cancelled || !videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
      } catch (error) {
        if (cancelled) return;
        console.error("Camera error:", error);
        setErrorMessage("Could not access your camera. Allow camera permission and try again.");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      activeRef.current = false;
      clearTimeout(timerRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function capturePhoto() {
    if (captureBusyRef.current) return;

    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    captureBusyRef.current = true;
    setIsScanning(true);
    setErrorMessage("");
    function captureFailed() {
      captureBusyRef.current = false;
      if (!activeRef.current) return;
      setIsScanning(false);
      setErrorMessage("Could not capture the photo. Please try again.");
    }
    try {
      const canvas = document.createElement("canvas");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!activeRef.current) return;
        if (!blob) {
          captureFailed();
          return;
        }

        const photoUrl = URL.createObjectURL(blob);
        previewUrlRef.current = photoUrl;
        setCapturedUrl(photoUrl);
        setIsScanning(true);

        timerRef.current = setTimeout(() => {
          if (activeRef.current) navigate("/result", { state: { photoBlob: blob } });
        }, SCAN_DURATION_MS);
      }, "image/jpeg");
    } catch {
      captureFailed();
    }
  }

  return (
    <main className="camera-screen">
      <button
        type="button"
        className="camera-close"
        onClick={() => navigate(-1)}
        disabled={isScanning}
        aria-label="Close camera"
      >
        <X size={22} />
      </button>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        onLoadedData={() => setCameraReady(true)}
        onEmptied={() => setCameraReady(false)}
        className={`camera-preview ${isScanning ? "scanning" : ""}`}
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {capturedUrl && (
        <img src={capturedUrl} className="frozen-frame" alt="" aria-hidden="true" />
      )}

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
        disabled={isScanning || !cameraReady}
        aria-label="Capture photo"
      />
    </main>
  );
}
