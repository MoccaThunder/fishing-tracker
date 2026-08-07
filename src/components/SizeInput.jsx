import "./SizeInput.css";

const SIZE_CONFIDENCE_LABEL = { high: "confident", medium: "rough guess", low: "very rough guess" };

function toInchesLocal(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return unit === "cm" ? n / 2.54 : n;
}

function fromInchesLocal(valueIn, unit) {
  return unit === "cm" ? valueIn * 2.54 : valueIn;
}

/**
 * @param {{ value: string, unit: "in" | "cm",
 *           onValueChange: (v: string) => void, onUnitChange: (u: "in"|"cm") => void,
 *           estimate?: { valueIn: number, confidence: string } | null }} props
 */
export default function SizeInput({ value, unit, onValueChange, onUnitChange, estimate }) {
  const currentIn = toInchesLocal(value, unit);
  const showSuggestion =
    !!estimate &&
    estimate.valueIn != null &&
    (currentIn === null || Math.abs(currentIn - estimate.valueIn) > 0.05);

  function acceptEstimate() {
    if (!estimate) return;
    const converted = fromInchesLocal(estimate.valueIn, unit);
    onValueChange(converted.toFixed(1));
  }

  return (
    <div className="sizeInput">
      <div className="sizeInput__row">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          className="sizeInput__field"
          placeholder="Approx. length"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        />
        <div className="sizeInput__units" role="group" aria-label="Unit">
          {["in", "cm"].map((u) => (
            <button
              key={u}
              type="button"
              className={`sizeInput__unit${unit === u ? " sizeInput__unit--active" : ""}`}
              onClick={() => onUnitChange(u)}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {showSuggestion && (
        <div className="sizeInput__suggestion">
          <span className="sizeInput__suggestionText">
            Claude estimates ~{fromInchesLocal(estimate.valueIn, unit).toFixed(1)}
            {unit} ({SIZE_CONFIDENCE_LABEL[estimate.confidence] || estimate.confidence})
          </span>
          <button type="button" className="sizeInput__accept" onClick={acceptEstimate}>
            Use estimate
          </button>
        </div>
      )}
    </div>
  );
}
