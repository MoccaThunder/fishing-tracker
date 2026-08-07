import { useState } from "react";
import { identifySpecies } from "../lib/speciesId";
import { getStoredApiKey, setStoredApiKey } from "../lib/apiKey";
import "./SpeciesId.css";

const CONFIDENCE_LABEL = { high: "confident", medium: "not sure", low: "unsure" };

/**
 * @param {{ photo: string | null,
 *           species: string,
 *           confirmed: boolean,
 *           onChange: (species: string) => void,
 *           onConfirmedChange: (confirmed: boolean) => void,
 *           onSizeEstimate?: (estimate: { valueIn: number, confidence: string } | null) => void }} props
 */
export default function SpeciesId({
  photo,
  species,
  confirmed,
  onChange,
  onConfirmedChange,
  onSizeEstimate,
}) {
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [showKeyField, setShowKeyField] = useState(!getStoredApiKey());
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);
  const [guess, setGuess] = useState(null); // { species, confidence, notes, estimatedLengthIn, sizeConfidence }

  function saveKey(value) {
    setApiKey(value);
    setStoredApiKey(value);
  }

  async function handleIdentify() {
    if (!photo) return;
    if (!apiKey) {
      setShowKeyField(true);
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const result = await identifySpecies(photo, apiKey);
      setGuess(result);
      onChange(result.species);
      onConfirmedChange(false);
      if (result.estimatedLengthIn != null && result.sizeConfidence !== "none") {
        onSizeEstimate?.({ valueIn: result.estimatedLengthIn, confidence: result.sizeConfidence });
      } else {
        onSizeEstimate?.(null);
      }
      setStatus("idle");
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setStatus("error");
    }
  }

  function handleEdit(value) {
    onChange(value);
    onConfirmedChange(false);
  }

  return (
    <div className="species">
      {showKeyField && (
        <div className="species__keyField">
          <label htmlFor="apiKey" className="species__keyLabel">
            Anthropic API key
          </label>
          <input
            id="apiKey"
            type="password"
            className="species__keyInput"
            placeholder="sk-ant-…"
            value={apiKey}
            onChange={(e) => saveKey(e.target.value)}
          />
          <p className="species__keyHint">
            Stored only on this device, used to call Claude directly from
            the browser.
          </p>
          {apiKey && (
            <button
              type="button"
              className="species__keyDone"
              onClick={() => setShowKeyField(false)}
            >
              Done
            </button>
          )}
        </div>
      )}

      <div className="species__row">
        <input
          type="text"
          className="species__input"
          placeholder="Species (e.g. Largemouth Bass)"
          value={species}
          onChange={(e) => handleEdit(e.target.value)}
        />
        <button
          type="button"
          className="species__idBtn"
          onClick={handleIdentify}
          disabled={!photo || status === "loading"}
        >
          {status === "loading" ? "Looking…" : "Identify"}
        </button>
      </div>

      {guess && species === guess.species && !confirmed && (
        <div className="species__suggestion">
          <span className="species__suggestionText">
            Claude's guess ({CONFIDENCE_LABEL[guess.confidence] || guess.confidence})
            {guess.notes ? ` — ${guess.notes}` : ""}
          </span>
          <button
            type="button"
            className="species__confirm"
            onClick={() => onConfirmedChange(true)}
          >
            Confirm
          </button>
        </div>
      )}

      {confirmed && species && (
        <span className="species__confirmed">✓ Confirmed</span>
      )}

      {!photo && (
        <p className="species__hint">Stage a photo first to identify it.</p>
      )}

      {status === "error" && <p className="species__error">{error}</p>}

      {!showKeyField && (
        <button
          type="button"
          className="species__changeKey"
          onClick={() => setShowKeyField(true)}
        >
          Change API key
        </button>
      )}
    </div>
  );
}
