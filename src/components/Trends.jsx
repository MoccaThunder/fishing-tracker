import { useMemo, useState } from "react";
import { overviewStats, speciesBreakdown, monthlyActivity } from "../lib/trends";
import { formatInches } from "../lib/records";
import "./Trends.css";

/**
 * Read-only stats view built entirely from data already in state — no new
 * storage, no external calls. Collapsible panel matching BackupRestore's
 * pattern so the page doesn't get longer for people who don't open it.
 *
 * @param {{ catches: any[], records: Record<string, import("../lib/records").SpeciesRecord> }} props
 */
export default function Trends({ catches, records }) {
  const [open, setOpen] = useState(false);

  const overview = useMemo(() => overviewStats(catches, records), [catches, records]);
  const topSpecies = useMemo(() => speciesBreakdown(records), [records]);
  const months = useMemo(() => monthlyActivity(catches), [catches]);

  const hasData = overview.totalCatches > 0;
  const maxMonthCount = Math.max(1, ...months.map((m) => m.count));
  const maxSpeciesCount = Math.max(1, ...topSpecies.map((s) => s.totalCaught));

  return (
    <div className="trends">
      <button
        type="button"
        className="trends__header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <svg className="trends__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M4 19V5m0 14h16M8 19v-6m5 6V9m5 10v-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="trends__title">Trends &amp; personal bests</span>
        <svg
          className={`trends__chevron${open ? " trends__chevron--open" : ""}`}
          viewBox="0 0 24 24"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="trends__body">
          {!hasData ? (
            <p className="trends__empty">
              Log a few catches and this'll fill in — totals, your best
              species, and a look at your last six months.
            </p>
          ) : (
            <>
              <div className="trends__stats">
                <div className="trends__stat">
                  <span className="trends__statValue">{overview.totalCatches}</span>
                  <span className="trends__statLabel">total catches</span>
                </div>
                <div className="trends__stat">
                  <span className="trends__statValue">{overview.speciesCount}</span>
                  <span className="trends__statLabel">species logged</span>
                </div>
                <div className="trends__stat">
                  <span className="trends__statValue">
                    {overview.biggest ? formatInches(overview.biggest.sizeIn) : "—"}
                  </span>
                  <span className="trends__statLabel">
                    {overview.biggest ? overview.biggest.species : "biggest catch"}
                  </span>
                </div>
              </div>

              {topSpecies.length > 0 && (
                <div className="trends__section">
                  <h3 className="trends__sectionTitle">Most caught</h3>
                  <ul className="trends__bars">
                    {topSpecies.map((s) => (
                      <li key={s.species} className="trends__barRow">
                        <span className="trends__barLabel">{s.species}</span>
                        <div className="trends__barTrack">
                          <div
                            className="trends__barFill"
                            style={{ width: `${(s.totalCaught / maxSpeciesCount) * 100}%` }}
                          />
                        </div>
                        <span className="trends__barCount">{s.totalCaught}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="trends__section">
                <h3 className="trends__sectionTitle">Last six months</h3>
                <div className="trends__chart" role="img" aria-label="Catches per month for the last six months">
                  {months.map((m) => (
                    <div key={`${m.year}-${m.month}`} className="trends__chartCol">
                      <div className="trends__chartBarTrack">
                        <div
                          className="trends__chartBar"
                          style={{ height: `${(m.count / maxMonthCount) * 100}%` }}
                        />
                      </div>
                      <span className="trends__chartCount">{m.count || ""}</span>
                      <span className="trends__chartLabel">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
