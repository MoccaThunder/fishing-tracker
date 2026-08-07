/**
 * Shape for a single logged catch. Matches the model drafted in README.md.
 *
 * @typedef {Object} Catch
 * @property {string} id
 * @property {number} timestamp        - ms since epoch
 * @property {{lat: number, lng: number, accuracy: number,
 *              waterBody?: {name: string, kind: string, distanceM: number}} | null} location
 * @property {string | null} species
 * @property {{value: number, unit: "in"|"cm"} | null} sizeApprox
 * @property {string | null} photo     - object URL or base64 data URL
 * @property {string} note             - freeform angler note, always available
 * @property {{ moonPhase: {name: string, illumination: number} | null,
 *              weather: {tempC: number, windKph: number, conditionLabel: string} | null
 *            } | null} conditions
 * @property {boolean | null} isNewLargest
 * @property {boolean | null} isNewSmallest
 */

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `catch_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Creates a new draft catch from what the catch form currently collects.
 * @param {{ photo?: string | null, note?: string,
 *           location?: {lat: number, lng: number, accuracy: number,
 *             waterBody?: {name: string, kind: string, distanceM: number}} | null,
 *           species?: string | null,
 *           sizeApprox?: {value: number, unit: "in"|"cm"} | null,
 *           conditions?: { moonPhase: {name: string, illumination: number} | null,
 *             weather: {tempC: number, windKph: number, conditionLabel: string} | null } | null
 *         }} partial
 * @returns {Catch}
 */
export function createDraftCatch(partial = {}) {
  return {
    id: makeId(),
    timestamp: Date.now(),
    location: partial.location ?? null,
    species: partial.species || null,
    sizeApprox: partial.sizeApprox ?? null,
    photo: partial.photo ?? null,
    note: partial.note ?? "",
    conditions: partial.conditions ?? null,
    isNewLargest: null,
    isNewSmallest: null,
  };
}

export function formatTimestamp(ms) {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
