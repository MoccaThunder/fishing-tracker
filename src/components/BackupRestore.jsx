import { useRef, useState } from "react";
import { exportBackup, importBackup, getAllCatches, getAllRecords } from "../lib/db";
import "./BackupRestore.css";

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Local-only backup: exports everything in IndexedDB as a downloadable
 * JSON file, and restores from one. This is the app's only way to move
 * data between devices or recover from a cleared browser, since there's
 * intentionally no cloud sync.
 *
 * @param {{ catchCount: number,
 *           onImported: (catches: any[], records: Record<string, any>) => void }} props
 */
export default function BackupRestore({ catchCount, onImported }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null); // { kind: "ok" | "error", text: string }
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  async function handleExport() {
    setBusy(true);
    setStatus(null);
    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catch-log-backup-${todayStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus({
        kind: "ok",
        text: `Exported ${backup.catches.length} catch${backup.catches.length === 1 ? "" : "es"}.`,
      });
    } catch (err) {
      setStatus({ kind: "error", text: err.message || "Couldn't export a backup." });
    } finally {
      setBusy(false);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const willReplace = catchCount > 0;
    if (
      willReplace &&
      !window.confirm(
        `This device already has ${catchCount} logged catch${catchCount === 1 ? "" : "es"}. ` +
          "Importing will replace them with the backup's contents. Continue?"
      )
    ) {
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("That file isn't valid JSON.");
      }
      const { catchCount: importedCatches } = await importBackup(parsed, { merge: false });
      const [catches, recordMap] = await Promise.all([getAllCatches(), getAllRecords()]);
      onImported(catches, recordMap);
      setStatus({
        kind: "ok",
        text: `Restored ${importedCatches} catch${importedCatches === 1 ? "" : "es"} from backup.`,
      });
    } catch (err) {
      setStatus({ kind: "error", text: err.message || "Couldn't restore that backup." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="backup">
      <button
        type="button"
        className="backup__header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <svg className="backup__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M12 3v11m0 0-4-4m4 4 4-4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="backup__title">Backup &amp; restore</span>
        <svg
          className={`backup__chevron${open ? " backup__chevron--open" : ""}`}
          viewBox="0 0 24 24"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="backup__body">
          <p className="backup__hint">
            Everything here lives only in this browser. Export a JSON backup
            to keep a copy, move to a new device, or recover from a cleared
            browser.
          </p>

          <p className="backup__count">
            {catchCount} catch{catchCount === 1 ? "" : "es"} on this device
          </p>

          <div className="backup__actions">
            <button type="button" className="btn btn--brass" onClick={handleExport} disabled={busy}>
              {busy ? "Working…" : "Export backup"}
            </button>
            <label className="backup__fileLabel">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleImportClick}
                disabled={busy}
              >
                Import backup
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleFile}
                hidden
              />
            </label>
          </div>

          {status && (
            <p className={`backup__status backup__status--${status.kind}`}>{status.text}</p>
          )}
        </div>
      )}
    </div>
  );
}
