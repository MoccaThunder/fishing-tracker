const DB_NAME = "fishing-tracker";
const DB_VERSION = 1;
const CATCHES_STORE = "catches";
const RECORDS_STORE = "speciesRecords";
let dbPromise = null;
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB isn't available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CATCHES_STORE)) {
        db.createObjectStore(CATCHES_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        db.createObjectStore(RECORDS_STORE, { keyPath: "species" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function getDB() {
  if (!dbPromise) dbPromise = openDatabase();
  return dbPromise;
}
function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function store(name, mode) {
  const db = await getDB();
  return db.transaction(name, mode).objectStore(name);
}
/** Saves (or overwrites) one catch. */
export async function saveCatch(catchEntry) {
  const s = await store(CATCHES_STORE, "readwrite");
  await reqToPromise(s.put(catchEntry));
}
/** Returns all catches, newest first. */
export async function getAllCatches() {
  const s = await store(CATCHES_STORE, "readonly");
  const all = await reqToPromise(s.getAll());
  return all.sort((a, b) => b.timestamp - a.timestamp);
}
export async function deleteCatch(id) {
  const s = await store(CATCHES_STORE, "readwrite");
  await reqToPromise(s.delete(id));
}
/** Saves (or overwrites) one species' record. */
export async function saveRecord(record) {
  const s = await store(RECORDS_STORE, "readwrite");
  await reqToPromise(s.put(record));
}
/** Returns all species records as a { [species]: SpeciesRecord } map. */
export async function getAllRecords() {
  const s = await store(RECORDS_STORE, "readonly");
  const all = await reqToPromise(s.getAll());
  const map = {};
  for (const record of all) map[record.species] = record;
  return map;
}
/**
 * Replaces the entire species-records store with a freshly computed map.
 * Used after a delete or edit changes which catches exist, since a single
 * catch going away or changing can shift what the largest/smallest/total
 * should be — rebuilding from scratch is simpler and safer than trying to
 * patch the old record incrementally.
 *
 * @param {Record<string, import("./records").SpeciesRecord>} recordsMap
 */
export async function replaceAllRecords(recordsMap) {
  const s = await store(RECORDS_STORE, "readwrite");
  await reqToPromise(s.clear());
  for (const record of Object.values(recordsMap)) {
    await reqToPromise(s.put(record));
  }
}
/** Wipes all locally stored catches and records. Used for testing/reset. */
export async function clearAll() {
  const catchesStore = await store(CATCHES_STORE, "readwrite");
  await reqToPromise(catchesStore.clear());
  const recordsStore = await store(RECORDS_STORE, "readwrite");
  await reqToPromise(recordsStore.clear());
}
const BACKUP_VERSION = 1;
/**
 * Builds a plain-object snapshot of everything stored on this device, in a
 * shape safe to JSON.stringify. Catches carry their photos as data URLs
 * already, so nothing extra is needed to make them portable.
 *
 * @returns {Promise<{ version: number, exportedAt: number, catches: any[], records: any[] }>}
 */
export async function exportBackup() {
  const [catches, recordMap] = await Promise.all([getAllCatches(), getAllRecords()]);
  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    catches,
    records: Object.values(recordMap),
  };
}
/**
 * Validates a parsed backup object without touching storage. Throws with a
 * user-facing message on anything that doesn't look like a Catch Log backup.
 */
function assertValidBackup(data) {
  if (!data || typeof data !== "object") {
    throw new Error("That file doesn't look like a Catch Log backup.");
  }
  if (!Array.isArray(data.catches) || !Array.isArray(data.records)) {
    throw new Error("That file doesn't look like a Catch Log backup.");
  }
}
/**
 * Restores catches and species records from a previously exported backup.
 * By default this replaces everything currently on the device; pass
 * `{ merge: true }` to layer the backup on top of existing data instead
 * (entries with matching ids/species are overwritten, others are kept).
 *
 * @param {{ version?: number, catches: any[], records: any[] }} data
 * @param {{ merge?: boolean }} [options]
 * @returns {Promise<{ catchCount: number, recordCount: number }>}
 */
export async function importBackup(data, { merge = false } = {}) {
  assertValidBackup(data);
  if (!merge) {
    await clearAll();
  }
  for (const entry of data.catches) {
    await saveCatch(entry);
  }
  for (const record of data.records) {
    await saveRecord(record);
  }
  return { catchCount: data.catches.length, recordCount: data.records.length };
}
