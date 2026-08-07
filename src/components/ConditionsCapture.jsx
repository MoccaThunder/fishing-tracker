import { useEffect, useState } from "react";
import {
  fetchWeather,
  moonPhase,
  celsiusToFahrenheit,
  kphToMph,
  prefersImperial,
} from "../lib/conditions";
import "./ConditionsCapture.css";

/**
 * Auto-captures conditions for a catch. Moon phase is computed locally the
 * moment this mounts (no network, no location needed), and weather is
 * fetched once a GPS fix is available. Both are enrichments — a failed or
 * pending weather fetch never blocks the form, it just leaves that line
 * out, same spirit as water body lookup.
 *
 * @param {{ location: {lat: number, lng: number} | null,
 *           onConditions: (conditions: {
 *             moonPhase: {name: string, illumination: number} | null,
 *             weather: {tempC: number, windKph: number, conditionLabel: string} | null
 *           }) => void }} props
 */
export default function ConditionsCapture({ location, onConditions }) {
  const [moon] = useState(() => moonPhase());
  const [weatherStatus, setWeatherStatus] = useState("idle"); // idle | loading | ok | offline | error
  const [weather, setWeather] = useState(null);
  const imperial = prefersImperial();

  useEffect(() => {
    onConditions({ moonPhase: moon, weather: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setWeatherStatus("loading");
    fetchWeather(location.lat, location.lng).then((result) => {
      if (cancelled) return;
      if (result.status === "ok") {
        const info = {
          tempC: result.tempC,
          windKph: result.windKph,
          conditionLabel: result.conditionLabel,
        };
        setWeather(info);
        setWeatherStatus("ok");
        onConditions({ moonPhase: moon, weather: info });
      } else {
        setWeather(null);
        setWeatherStatus(result.status);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);

  return (
    <div className="conditions">
      <div className="conditions__row">
        <span className="conditions__moon" title={`${moon.illumination}% illuminated`}>
          {moon.name} · {moon.illumination}% lit
        </span>
      </div>

      {weatherStatus === "loading" && (
        <div className="conditions__row">
          <span className="conditions__weather conditions__weather--loading">
            Checking weather…
          </span>
        </div>
      )}

      {weatherStatus === "ok" && weather && (
        <div className="conditions__row">
          <span className="conditions__weather">
            {imperial
              ? `${Math.round(celsiusToFahrenheit(weather.tempC))}°F`
              : `${Math.round(weather.tempC)}°C`}
            {" · "}
            {weather.conditionLabel}
            {weather.windKph != null && (
              <>
                {" · "}
                {imperial
                  ? `${Math.round(kphToMph(weather.windKph))} mph wind`
                  : `${Math.round(weather.windKph)} km/h wind`}
              </>
            )}
          </span>
        </div>
      )}

      {!location && (
        <p className="conditions__hint">Add a location above to also capture weather.</p>
      )}
    </div>
  );
}
