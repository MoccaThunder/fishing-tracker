import { useCallback, useEffect, useRef, useState } from "react";
import "./CameraCapture.css";

/**
 * Photo capture for a catch. Tries a live camera preview first (best on
 * phone browsers); if the camera can't be opened, falls back to a plain
 * file input with capture="environment" so the browser's own camera/photo
 * picker takes over.
 *
 * @param {{ photo: string | null, onCapture: (dataUrl: string) => void, onClear: () => void }} props
 */
export default function CameraCapture({ photo, onCapture, onClear }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [videoReady, setVideoReady] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
    setVideoReady(false);
  }, []);

  useEffect(() => stopStream, [stopStream]);

  // Attaches the stream to the <video> element once it's actually mounted.
  // The element only mounts after cameraOn becomes true, so this has to
  // happen in an effect that runs after that render — not inline inside
  // startCamera(), where the element doesn't exist yet.
  useEffect(() => {
    if (!cameraOn || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.muted = true; // some mobile browsers only honor the JS property, not the HTML attribute
    const handleReady = () => setVideoReady(true);
    video.addEventListener("loadedmetadata", handleReady);
    video.play().catch(() => {
      // some browsers resolve/reject play() before the stream is actually
      // ready — loadedmetadata above is the real signal frames are flowing
    });
    return () => {
      video.removeEventListener("loadedmetadata", handleReady);
    };
  }, [cameraOn]);

  async function startCamera() {
    setCameraError(null);
    setVideoReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true); // mounts <video>; the effect above wires up the stream
    } catch (err) {
      setCameraError(
        "Couldn't reach the camera — use “Upload a photo” instead."
      );
    }
  }

  function takeSnapshot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    onCapture(canvas.toDataURL("image/jpeg", 0.9));
    stopStream();
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCapture(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="capture">
      <div className="capture__frame">
        {photo ? (
          <img className="capture__photo" src={photo} alt="Staged catch" />
        ) : cameraOn ? (
          <>
            <video ref={videoRef} className="capture__video" autoPlay playsInline muted />
            {!videoReady && <div className="capture__loading">Starting camera…</div>}
          </>
        ) : (
          <div className="capture__empty">
            <svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true">
              <path
                d="M8 16h6l3-5h14l3 5h6a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <circle cx="24" cy="27" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" />
            </svg>
            <span>No photo staged yet</span>
          </div>
        )}
        <div className="capture__corner capture__corner--tl" />
        <div className="capture__corner capture__corner--tr" />
        <div className="capture__corner capture__corner--bl" />
        <div className="capture__corner capture__corner--br" />
      </div>

      {cameraError && <p className="capture__error">{cameraError}</p>}

      <div className="capture__controls">
        {photo ? (
          <button type="button" className="btn btn--ghost" onClick={onClear}>
            Retake
          </button>
        ) : cameraOn ? (
          <button
            type="button"
            className="btn btn--shutter"
            onClick={takeSnapshot}
            aria-label="Take photo"
            disabled={!videoReady}
          >
            <span className="btn__shutter-ring" />
          </button>
        ) : (
          <>
            <button type="button" className="btn btn--brass" onClick={startCamera}>
              Open camera
            </button>
            <label className="btn btn--ghost">
              Upload a photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                hidden
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
