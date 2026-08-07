/**
 * Derives trend/stat views from data that's already stored — no new
 * IndexedDB stores, no new fields on Catch/SpeciesRecord. Pure functions,
 * same pattern as lib/records.js.
 */

/**
 * @param {any[]} catches
 * @param {Record<string, import("./records").SpeciesRecord>} records
 * @returns {{ totalCatches: number, speciesCount: number,
 *             biggest: { species: string, sizeIn: number, catchId: string } | null }}
 */
export function overviewStats(catches, records) {
  const speciesList = Object.values(records);
  let biggest = null;
  for (const r of speciesList) {
    if (r.largest && (!biggest || r.largest.sizeIn > biggest.sizeIn)) {
      biggest = { species: r.species, sizeIn: r.largest.sizeIn, catchId: r.largest.catchId };
    }
  }
  return {
    totalCatches: catches.length,
    speciesCount: speciesList.length,
    biggest,
  };
}

/**
 * Species leaderboard by catch count, most-caught first.
 * @param {Record<string, import("./records").SpeciesRecord>} records
 * @param {number} limit
 */
export function speciesBreakdown(records, limit = 6) {
  return Object.values(records)
    .sort((a, b) => b.totalCaught - a.totalCaught)
    .slice(0, limit);
}

/**
 * Catch counts for the last `months` calendar months, oldest first, with
 * zero-filled gaps so quiet months still show up on the chart.
 * @param {any[]} catches
 * @param {number} months
 * @returns {{ year: number, month: number, label: string, count: number }[]}
 */
export function monthlyActivity(catches, months = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleString(undefined, { month: "short" }),
      count: 0,
    });
  }
  for (const c of catches) {
    const d = new Date(c.timestamp);
    const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth());
    if (bucket) bucket.count += 1;
  }
  return buckets;
}
