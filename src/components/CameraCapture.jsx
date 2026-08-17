import { useCallback, useEffect, useRef, useState } from "react";
import { computeScaledDimensions, resizeImageFile, JPEG_QUALITY } from "../lib/imageResize";
import "./CameraCapture.css";
/**
 * Photo capture for a catch. Tries a live camera preview first (best on
 * phone browsers); if the camera can't be opened, falls back to a plain
 * file input with capture="environment" so the browser's own camera/photo
 * picker takes over. Both paths resize down to a max long edge before the
 * photo is ever staged, to keep uploads fast on a weak signal.
 *
 * @param {{ photo: string | null, onCapture: (dataUrl: string) => void, onClear: () => void }} props
 */
export default function CameraCapture({ photo, onCapture, onClear }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
    setVideoReady(false);
  }, []);
  useEffect(() => stopStream, [stopStream]);
  useEffect(() => {
    if (!cameraOn || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    const handleReady = () => setVideoReady(true);
    video.addEventListener("loadedmetadata", handleReady);
    video.play().catch(() => {});
    return () => video.removeEventListener("loadedmetadata", handleReady);
  }, [cameraOn]);
  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch (err) {
      setCameraError(
        "Couldn't reach the camera — use “Upload a photo” instead."
      );
    }
  }
  function takeSnapshot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const { width, height } = computeScaledDimensions(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(video, 0, 0, width, height);
    onCapture(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    stopStream();
  }
  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProcessing(true);
    setCameraError(null);
    try {
      const resized = await resizeImageFile(file);
      onCapture(resized);
    } catch (err) {
      setCameraError(err.message || "Couldn't process that photo.");
    } finally {
      setProcessing(false);
    }
  }
  return (
    <div className="capture">
      <div className="capture__frame">
        {photo ? (
          <img className="capture__photo" src={photo} alt="Staged catch" />
        ) : cameraOn ? (
          <video ref={videoRef} className="capture__video" playsInline muted />
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
      {cameraOn && !videoReady && (
        <p className="capture__error">Starting camera…</p>
      )}
      {processing && <p className="capture__error">Processing photo…</p>}
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
                disabled={processing}
                hidden
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
