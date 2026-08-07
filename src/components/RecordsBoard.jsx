import { formatInches } from "../lib/records";
import "./RecordsBoard.css";

/**
 * @param {{ records: Record<string, import("../lib/records").SpeciesRecord> }} props
 */
export default function RecordsBoard({ records }) {
  const entries = Object.values(records).sort((a, b) =>
    a.species.localeCompare(b.species)
  );

  if (entries.length === 0) return null;

  return (
    <section className="board">
      <h2 className="board__title">Personal bests this session</h2>
      <ul className="board__list">
        {entries.map((r) => (
          <li key={r.species} className="board__row">
            <span className="board__species">{r.species}</span>
            <span className="board__stats">
              {r.largest && (
                <span className="board__stat">
                  <span className="board__statLabel">largest</span>
                  {formatInches(r.largest.sizeIn)}
                </span>
              )}
              {r.smallest && (
                <span className="board__stat">
                  <span className="board__statLabel">smallest</span>
                  {formatInches(r.smallest.sizeIn)}
                </span>
              )}
              <span className="board__stat">
                <span className="board__statLabel">caught</span>
                {r.totalCaught}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
