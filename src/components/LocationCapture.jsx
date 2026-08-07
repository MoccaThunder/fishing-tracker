import { useCallback, useEffect, useState } from "react";
import { lookupWaterBody } from "../lib/waterBody";
import "./LocationCapture.css";

/**
 * Grabs a GPS fix for the catch, then looks up the nearest named water
 * body for it. Requests automatically on mount (most anglers want this to
 * "just happen"), but never blocks the form — skipping, a denied/failed
 * fix, or a failed/empty water body lookup all leave the form usable.
 *
 * @param {{ location: {lat: number, lng: number, accuracy: number,
 *             waterBody?: {name: string, kind: string, distanceM: number} } | null,
 *           onLocate: (loc: {lat: number, lng: number, accuracy: number,
 *             waterBody?: {name: string, kind: string, distanceM: number}}) => void,
 *           onSkip: () => void }} props
 */
export default function LocationCapture({ location, onLocate, onSkip }) {
  const [status, setStatus] = useState("idle"); // idle | locating | denied | unavailable
  const [skipped, setSkipped] = useState(false);
  const [waterStatus, setWaterStatus] = useState("idle"); // idle | loading | ok | none | offline | error
  const [waterInfo, setWaterInfo] = useState(null); // { name, kind, distanceM } | null

  const lookupWater = useCallback(
    async (coords) => {
      setWaterStatus("loading");
      const result = await lookupWaterBody(coords.lat, coords.lng);
      if (result.status === "ok") {
        const info = { name: result.name, kind: result.kind, distanceM: result.distanceM };
        setWaterInfo(info);
        setWaterStatus("ok");
        onLocate({ ...coords, waterBody: info });
      } else {
        setWaterInfo(null);
        setWaterStatus(result.status);
      }
    },
    [onLocate]
  );

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setSkipped(false);
    setStatus("locating");
    setWaterStatus("idle");
    setWaterInfo(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        onLocate(coords);
        setStatus("idle");
        lookupWater(coords);
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [onLocate, lookupWater]);

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSkip() {
    setSkipped(true);
    setStatus("idle");
    onSkip();
  }

  return (
    <div className="locate">
      <div className="locate__row">
        <svg className="locate__pin" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="9" r="2.4" fill="currentColor" />
        </svg>

        <div className="locate__body">
          {location && (
            <>
              <span className="locate__coords">
                {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
                <span className="locate__accuracy"> ±{Math.round(location.accuracy)}m</span>
              </span>
              {waterStatus === "loading" && (
                <span className="locate__water locate__water--loading">Looking up water body…</span>
              )}
              {waterStatus === "ok" && waterInfo && (
                <span className="locate__water">
                  {waterInfo.name}
                  <span className="locate__waterDistance"> · ~{waterInfo.distanceM}m away</span>
                </span>
              )}
            </>
          )}
          {!location && status === "locating" && (
            <span className="locate__status">Finding your spot…</span>
          )}
          {!location && status === "denied" && (
            <span className="locate__status locate__status--warn">
              Location access denied
            </span>
          )}
          {!location && status === "unavailable" && (
            <span className="locate__status locate__status--warn">
              Couldn't get a fix
            </span>
          )}
          {!location && skipped && status === "idle" && (
            <span className="locate__status">No location for this catch</span>
          )}
        </div>

        {!location && (status === "denied" || status === "unavailable") && (
          <button type="button" className="locate__link" onClick={requestLocation}>
            Retry
          </button>
        )}
        {location && (
          <button type="button" className="locate__link" onClick={requestLocation}>
            Refresh
          </button>
        )}
        {!location && !skipped && status !== "locating" && (
          <button type="button" className="locate__link" onClick={handleSkip}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
