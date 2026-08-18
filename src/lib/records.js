/**
 * @typedef {Object} SpeciesRecord
 * @property {string} species
 * @property {{ sizeIn: number, catchId: string } | null} largest
 * @property {{ sizeIn: number, catchId: string } | null} smallest
 * @property {number} totalCaught
 */
/** Converts a size to inches so records compare consistently regardless of
 * which unit an individual catch was logged in. */
export function toInches(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return unit === "cm" ? n / 2.54 : n;
}
function emptyRecord(species) {
  return { species, largest: null, smallest: null, totalCaught: 0 };
}
/**
 * Folds one finalized catch into the records map, returning both the
 * updated map and whether this catch set a new largest/smallest for its
 * species. Catches without a species or a size don't affect records.
 *
 * @param {Record<string, SpeciesRecord>} records
 * @param {{ id: string, species: string | null, sizeApprox: {value: number, unit: string} | null }} catchEntry
 */
export function updateRecords(records, catchEntry) {
  const species = catchEntry.species?.trim();
  const sizeIn = catchEntry.sizeApprox
    ? toInches(catchEntry.sizeApprox.value, catchEntry.sizeApprox.unit)
    : null;
  if (!species || sizeIn === null) {
    return { records, isNewLargest: null, isNewSmallest: null };
  }
  const prior = records[species] ?? emptyRecord(species);
  const isNewLargest = !prior.largest || sizeIn > prior.largest.sizeIn;
  const isNewSmallest = !prior.smallest || sizeIn < prior.smallest.sizeIn;
  const updated = {
    species,
    totalCaught: prior.totalCaught + 1,
    largest: isNewLargest ? { sizeIn, catchId: catchEntry.id } : prior.largest,
    smallest: isNewSmallest ? { sizeIn, catchId: catchEntry.id } : prior.smallest,
  };
  return {
    records: { ...records, [species]: updated },
    isNewLargest,
    isNewSmallest,
  };
}
/**
 * Rebuilds a complete records map from scratch given a list of catches.
 * Used after a delete or edit, since a single catch changing or disappearing
 * can shift what the largest/smallest/total should be for its species —
 * recomputing fresh is simpler and safer than patching the old record.
 * Order of the input catches doesn't affect the result.
 *
 * @param {any[]} catches
 * @returns {Record<string, SpeciesRecord>}
 */
export function buildRecordsFromCatches(catches) {
  let records = {};
  for (const catchEntry of catches) {
    const result = updateRecords(records, catchEntry);
    records = result.records;
  }
  return records;
}
export function formatInches(sizeIn, displayUnit = "in") {
  if (sizeIn === null || sizeIn === undefined) return "";
  const value = displayUnit === "cm" ? sizeIn * 2.54 : sizeIn;
  return `${value.toFixed(1)}${displayUnit}`;
}
