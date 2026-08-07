import { fetchExternalJson } from "./externalData";

/**
 * Reverse-geocodes a GPS fix into the nearest *named* water body (lake,
 * pond, reservoir, river, stream, etc.) using OpenStreetMap data via the
 * public Overpass API. No API key required, matching this app's
 * zero-extra-setup approach — the only key anyone enters is their own
 * Anthropic key for species ID.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {{ radiusMeters?: number }} [options]
 * @returns {Promise<{
 *   status: "ok" | "none" | "offline" | "error",
 *   name: string | null,
 *   kind: string | null,
 *   distanceM: number | null,
 *   error?: string
 * }>}
 */
export async function lookupWaterBody(lat, lng, { radiusMeters = 1500 } = {}) {
  const round = (n) => Math.round(n * 10000) / 10000; // ~11m precision — plenty for caching one GPS fix
  const cacheKey = `waterbody:${round(lat)},${round(lng)},${radiusMeters}`;

  const query = `
    [out:json][timeout:8];
    (
      way["natural"="water"](around:${radiusMeters},${lat},${lng});
      way["waterway"~"river|stream|canal"](around:${radiusMeters},${lat},${lng});
      relation["natural"="water"](around:${radiusMeters},${lat},${lng});
    );
    out center tags;
  `.trim();

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const result = await fetchExternalJson(url, { timeoutMs: 7000, cacheKey });

  if (result.status === "offline") {
    return { status: "offline", name: null, kind: null, distanceM: null };
  }
  if (result.status === "error") {
    return { status: "error", name: null, kind: null, distanceM: null, error: result.error };
  }

  const named = (result.data?.elements || []).filter((el) => el.tags?.name);
  if (named.length === 0) {
    return { status: "none", name: null, kind: null, distanceM: null };
  }

  const withDistance = named.map((el) => {
    const elLat = el.center?.lat ?? el.lat;
    const elLng = el.center?.lon ?? el.lon;
    return { el, distanceM: haversineMeters(lat, lng, elLat, elLng) };
  });
  withDistance.sort((a, b) => a.distanceM - b.distanceM);
  const nearest = withDistance[0];

  return {
    status: "ok",
    name: nearest.el.tags.name,
    kind: describeKind(nearest.el.tags),
    distanceM: Math.round(nearest.distanceM),
  };
}

function describeKind(tags) {
  if (tags.waterway) return tags.waterway; // "river" | "stream" | "canal"
  if (tags.natural === "water") return tags.water || "lake"; // "lake" | "pond" | "reservoir" | ...
  return "water";
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
