import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

export default function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

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
    const video = videoRef.current;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const photoUrl = URL.createObjectURL(blob);
      navigate("/result", { state: { photoUrl } });
    }, "image/jpeg");
  }

  return (
    <main className="camera-screen">
      <video ref={videoRef} autoPlay playsInline className="camera-preview" />

      <button
        className="capture-button"
        onClick={capturePhoto}
        aria-label="Capture photo"
      />
    </main>
  );
}