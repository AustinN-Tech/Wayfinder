import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { CameraOff, X } from "lucide-react";

const SCAN_DURATION_MS = 2600;

// getUserMedia fails for several quite different reasons, and the fix is
// different for each - "allow the permission" is useless advice to someone
// whose laptop has no camera, or whose camera is held by another app.
const CAMERA_TROUBLE = {
  denied: {
    title: "Camera access is blocked",
    body: "Wayfinder needs the camera to record what you found. Your browser is currently refusing it for this site.",
    steps: [
      "Open the site settings from the lock or camera icon in the address bar.",
      "Set Camera to Allow.",
      "Come back and try again.",
    ],
  },
  missing: {
    title: "No camera found",
    body: "This device does not seem to have a camera available, so there is nothing to record with.",
  },
  busy: {
    title: "The camera is already in use",
    body: "Another app or browser tab has hold of the camera. Close it, then try again.",
  },
  insecure: {
    title: "The camera needs a secure connection",
    body: "Browsers only hand over the camera over HTTPS or on localhost. Open Wayfinder on a secure address and try again.",
  },
  unknown: {
    title: "Could not open the camera",
    body: "Something went wrong reaching the camera. Try again, and if it keeps failing, reload the page.",
  },
};

function troubleFor(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "missing";
    case "NotReadableError":
    case "TrackStartError":
      return "busy";
    default:
      return "unknown";
  }
}

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
  const [trouble, setTrouble] = useState(null);
  // Bumped by "Try again" to re-run the effect: once the permission has been
  // changed in site settings, asking again is all it takes.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    activeRef.current = true;
    async function startCamera() {
      // Absent entirely on a plain-http origin, so this throws a TypeError
      // rather than a DOMException if it isn't checked first.
      if (!navigator.mediaDevices?.getUserMedia) {
        setTrouble("insecure");
        return;
      }
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
        setTrouble(null);
      } catch (error) {
        if (cancelled) return;
        console.error("Camera error:", error);
        setTrouble(troubleFor(error));
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
  }, [attempt]);

  function retryCamera() {
    setTrouble(null);
    setAttempt((count) => count + 1);
  }

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

  const troubleCopy = trouble ? CAMERA_TROUBLE[trouble] : null;

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

      {troubleCopy && (
        <div
          className="camera-trouble"
          role="alertdialog"
          aria-labelledby="camera-trouble-title"
        >
          <div className="camera-trouble-card">
            <span className="camera-trouble-icon" aria-hidden="true">
              <CameraOff size={26} />
            </span>
            <h2 id="camera-trouble-title">{troubleCopy.title}</h2>
            <p>{troubleCopy.body}</p>

            {troubleCopy.steps && (
              <ol className="camera-trouble-steps">
                {troubleCopy.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}

            <div className="camera-trouble-actions">
              {trouble !== "missing" && (
                <button type="button" className="camera-trouble-btn" onClick={retryCamera}>
                  Try again
                </button>
              )}
              <button
                type="button"
                className="camera-trouble-btn is-secondary"
                onClick={() => navigate(-1)}
              >
                Back to journal
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="camera-capture-error" role="alert">
          {errorMessage}
        </p>
      )}
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

      {!troubleCopy && (
        <button
          className="capture-button"
          onClick={capturePhoto}
          disabled={isScanning || !cameraReady}
          aria-label="Capture photo"
        />
      )}
    </main>
  );
}
