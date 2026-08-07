import { useEffect, useState } from "react";
import CatchForm from "./components/CatchForm";
import RecordsBoard from "./components/RecordsBoard";
import BackupRestore from "./components/BackupRestore";
import Trends from "./components/Trends";
import { formatTimestamp } from "./lib/catchModel";
import { updateRecords, formatInches } from "./lib/records";
import { getAllCatches, getAllRecords, saveCatch, saveRecord } from "./lib/db";
import "./App.css";

export default function App() {
  const [staged, setStaged] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

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
        await saveRecord(nextRecords[species]);
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
                          {c.location.waterBody?.name
                            ? c.location.waterBody.name
                            : `${c.location.lat.toFixed(3)}°, ${c.location.lng.toFixed(3)}°`}
                        </span>
                      )}
                    </span>
                    {c.note && <span className="stagedList__note">{c.note}</span>}
                    {c.conditions && (c.conditions.weather || c.conditions.moonPhase) && (
                      <span className="stagedList__conditions">
                        {c.conditions.weather &&
                          `${Math.round(c.conditions.weather.tempC)}°C · ${c.conditions.weather.conditionLabel}`}
                        {c.conditions.weather && c.conditions.moonPhase && " · "}
                        {c.conditions.moonPhase && c.conditions.moonPhase.name}
                      </span>
                    )}
                  </div>
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
