/**
 * Shared helper for calling external (non-Anthropic) APIs from the browser.
 * Introduced for water body lookup; auto-captured conditions (weather /
 * water temp / moon phase) is expected to reuse this same helper later.
 *
 * Ground rules this app follows for any external source:
 * - No API key required. The only key anyone enters is their own Anthropic
 *   key for species ID — external "nice to have" lookups shouldn't add to
 *   that setup burden.
 * - Every call gets a timeout, since a flaky public API shouldn't hang the
 *   catch form.
 * - `navigator.onLine` is checked first so we fail fast instead of waiting
 *   out a timeout when there's clearly no signal (a boat, a remote lake).
 * - Results are cached in-memory for the session by a caller-supplied key,
 *   since a GPS fix rarely moves between steps of logging one catch.
 */

const cache = new Map();

/**
 * @param {string} url
 * @param {{ timeoutMs?: number, cacheKey?: string }} [options]
 * @returns {Promise<{ status: "ok" | "offline" | "error", data: any,
 *                      error?: string, fromCache?: boolean }>}
 */
export async function fetchExternalJson(url, { timeoutMs = 6000, cacheKey } = {}) {
  if (cacheKey && cache.has(cacheKey)) {
    return { status: "ok", data: cache.get(cacheKey), fromCache: true };
  }

  if (typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine) {
    return { status: "offline", data: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return { status: "error", data: null, error: `Request failed (${response.status}).` };
    }
    const data = await response.json();
    if (cacheKey) cache.set(cacheKey, data);
    return { status: "ok", data, fromCache: false };
  } catch (err) {
    if (err.name === "AbortError") {
      return { status: "error", data: null, error: "Request timed out." };
    }
    return { status: "error", data: null, error: "Network error." };
  } finally {
    clearTimeout(timer);
  }
}
