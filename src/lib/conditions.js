import { fetchExternalJson } from "./externalData";

const WEATHER_CODE_LABELS = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

/**
 * Fetches current weather for a GPS fix from Open-Meteo — free, no API
 * key required, matching this app's zero-extra-setup approach. Always
 * fetched in metric; callers convert for display as needed. Deliberately
 * air temperature only — water temperature isn't reliably available for
 * arbitrary GPS points from free sources (only specific monitored buoys
 * and gauges report it), so it's left out rather than faked.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ status: "ok"|"offline"|"error",
 *   tempC: number|null, windKph: number|null, conditionLabel: string|null,
 *   error?: string }>}
 */
export async function fetchWeather(lat, lng) {
  const round = (n) => Math.round(n * 100) / 100; // ~1km precision, plenty for weather
  const timeBucket = Math.floor(Date.now() / (15 * 60 * 1000)); // refetch at most every 15 min
  const cacheKey = `weather:${round(lat)},${round(lng)},${timeBucket}`;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`;

  const result = await fetchExternalJson(url, { timeoutMs: 6000, cacheKey });

  if (result.status === "offline") {
    return { status: "offline", tempC: null, windKph: null, conditionLabel: null };
  }
  if (result.status === "error") {
    return { status: "error", tempC: null, windKph: null, conditionLabel: null, error: result.error };
  }

  const current = result.data?.current;
  if (!current || typeof current.temperature_2m !== "number") {
    return { status: "error", tempC: null, windKph: null, conditionLabel: null, error: "Unexpected response." };
  }

  return {
    status: "ok",
    tempC: current.temperature_2m,
    windKph: current.wind_speed_10m ?? null,
    conditionLabel: WEATHER_CODE_LABELS[current.weather_code] || "Unknown conditions",
  };
}

export function celsiusToFahrenheit(c) {
  return (c * 9) / 5 + 32;
}

export function kphToMph(kph) {
  return kph * 0.621371;
}

/**
 * Heuristic for defaulting to imperial display units, based on browser
 * locale. Falls back to metric for anything not explicitly US English.
 */
export function prefersImperial() {
  if (typeof navigator === "undefined") return false;
  return (navigator.language || "").toLowerCase() === "en-us";
}

const PHASE_NAMES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
];

/**
 * Computes the moon phase for a given date — pure math, no network call,
 * so unlike weather this works offline and doesn't need a GPS fix at all.
 *
 * @param {Date} [date]
 * @returns {{ name: string, illumination: number }} illumination is 0-100
 */
export function moonPhase(date = new Date()) {
  const synodicMonth = 29.53058867; // days
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14); // a known reference new moon
  const diffDays = (date.getTime() - knownNewMoon) / 86400000;
  const phaseFraction = (((diffDays % synodicMonth) + synodicMonth) % synodicMonth) / synodicMonth; // 0..1

  const index = Math.round(phaseFraction * 8) % 8;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * phaseFraction)) * 50);

  return { name: PHASE_NAMES[index], illumination };
}
