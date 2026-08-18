import { useEffect, useState } from "react";
import CatchForm from "./components/CatchForm";
import RecordsBoard from "./components/RecordsBoard";
import BackupRestore from "./components/BackupRestore";
import Trends from "./components/Trends";
import CatchEditForm from "./components/CatchEditForm";
import { formatTimestamp } from "./lib/catchModel";
import { updateRecords, buildRecordsFromCatches, formatInches } from "./lib/records";
import {
  getAllCatches,
  getAllRecords,
  saveCatch,
  deleteCatch,
  replaceAllRecords,
} from "./lib/db";
import "./App.css";
export default function App() {
  const [staged, setStaged] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllCatches(), getAllRecords()])
      .then(([catches, recordMap]) => {
        if (cancelled) return;
        setStaged(catches);
        setRecords(recordMap);
      })
      .catch((err) => {
        if (!cancelled) setDbError(err.message || "Couldn't load saved catches.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function handleStage(draft) {
    const { records: nextRecords, isNewLargest, isNewSmallest } = updateRecords(
      records,
      draft
    );
    const finalized = { ...draft, isNewLargest, isNewSmallest };
    setRecords(nextRecords);
    setStaged((prev) => [finalized, ...prev]);
    try {
      await saveCatch(finalized);
      const species = finalized.species?.trim();
      if (species && nextRecords[species]) {
        await replaceAllRecords(nextRecords);
      }
      setDbError(null);
    } catch (err) {
      setDbError(err.message || "Couldn't save that catch to this device.");
    }
  }
  function handleImported(catches, recordMap) {
    setStaged(catches);
    setRecords(recordMap);
    setDbError(null);
  }
  async function handleDelete(id) {
    const target = staged.find((c) => c.id === id);
    const label = target?.species ? `this ${target.species}` : "this catch";
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;
    const remaining = staged.filter((c) => c.id !== id);
    const nextRecords = buildRecordsFromCatches(remaining);
    setStaged(remaining);
    setRecords(nextRecords);
    if (editingId === id) setEditingId(null);
    try {
      await deleteCatch(id);
      await replaceAllRecords(nextRecords);
      setDbError(null);
    } catch (err) {
      setDbError(err.message || "Couldn't delete that catch.");
    }
  }
  async function handleEditSave(updatedCatch) {
    const remaining = staged.map((c) => (c.id === updatedCatch.id ? updatedCatch : c));
    const nextRecords = buildRecordsFromCatches(remaining);
    setStaged(remaining);
    setRecords(nextRecords);
    setEditingId(null);
    try {
      await saveCatch(updatedCatch);
      await replaceAllRecords(nextRecords);
      setDbError(null);
    } catch (err) {
      setDbError(err.message || "Couldn't save those changes.");
    }
  }
  return (
    <div className="page">
      <div className="page__water" aria-hidden="true" />
      <main className="page__main">
        <CatchForm onStage={handleStage} />
        {dbError && <p className="page__dbError">{dbError}</p>}
        <RecordsBoard records={records} />
        {!loading && <Trends catches={staged} records={records} />}
        {!loading && (
          <BackupRestore catchCount={staged.length} onImported={handleImported} />
        )}
        {!loading && staged.length > 0 && (
          <section className="stagedList">
            <h2 className="stagedList__title">
              Catch log
              <span className="stagedList__count">{staged.length}</span>
            </h2>
            <ul className="stagedList__items">
              {staged.map((c) => (
                <li key={c.id} className="stagedList__item">
                  <img src={c.photo} alt="" className="stagedList__thumb" />
                  <div className="stagedList__meta">
                    <div className="stagedList__headline">
                      {c.species && (
                        <span className="stagedList__species">{c.species}</span>
                      )}
                      {c.sizeApprox && (
                        <span className="stagedList__size">
                          {formatInches(
                            c.sizeApprox.unit === "cm"
                              ? c.sizeApprox.value / 2.54
                              : c.sizeApprox.value,
                            c.sizeApprox.unit
                          )}
                        </span>
                      )}
                      {c.isNewLargest && (
                        <span className="stagedList__badge stagedList__badge--largest">
                          new largest
                        </span>
                      )}
                      {c.isNewSmallest && (
                        <span className="stagedList__badge stagedList__badge--smallest">
                          new smallest
                        </span>
                      )}
                    </div>
                    <span className="stagedList__time">
                      {formatTimestamp(c.timestamp)}
                      {c.location && (
                        <span className="stagedList__geo">
                          {" · "}
                          {c.location.lat.toFixed(3)}°, {c.location.lng.toFixed(3)}°
                        </span>
                      )}
                    </span>
                    {c.note && <span className="stagedList__note">{c.note}</span>}
                  </div>
                  <div className="stagedList__rowActions">
                    <button
                      type="button"
                      className="stagedList__iconBtn"
                      aria-label="Edit catch"
                      onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path
                          d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="stagedList__iconBtn stagedList__iconBtn--danger"
                      aria-label="Delete catch"
                      onClick={() => handleDelete(c.id)}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path
                          d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                  {editingId === c.id && (
                    <CatchEditForm
                      catchEntry={c}
                      onSave={handleEditSave}
                      onCancel={() => setEditingId(null)}
                    />
                  )}
                </li>
              ))}
            </ul>
            <p className="stagedList__note-global">
              Saved on this device — nothing leaves your browser.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
