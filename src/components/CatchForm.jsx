import { useState } from "react";
import CameraCapture from "./CameraCapture";
import LocationCapture from "./LocationCapture";
import SpeciesId from "./SpeciesId";
import SizeInput from "./SizeInput";
import ConditionsCapture from "./ConditionsCapture";
import { createDraftCatch, formatTimestamp } from "../lib/catchModel";
import "./CatchForm.css";

/**
 * @param {{ onStage: (draft: import("../lib/catchModel").Catch) => void }} props
 */
export default function CatchForm({ onStage }) {
  const [photo, setPhoto] = useState(null);
  const [note, setNote] = useState("");
  const [location, setLocation] = useState(null);
  const [species, setSpecies] = useState("");
  const [speciesConfirmed, setSpeciesConfirmed] = useState(false);
  const [sizeValue, setSizeValue] = useState("");
  const [sizeUnit, setSizeUnit] = useState("in");
  const [sizeEstimate, setSizeEstimate] = useState(null); // { valueIn, confidence } | null
  const [conditions, setConditions] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [resetKey, setResetKey] = useState(0);

  function handleClearPhoto() {
    setPhoto(null);
    setSizeEstimate(null);
  }

  function handleStage(e) {
    e.preventDefault();
    if (!photo) return;
    const draft = createDraftCatch({
      photo,
      note: note.trim(),
      location,
      species: species.trim(),
      sizeApprox: sizeValue ? { value: Number(sizeValue), unit: sizeUnit } : null,
      conditions,
    });
    onStage(draft);
    setPhoto(null);
    setNote("");
    setLocation(null);
    setSpecies("");
    setSpeciesConfirmed(false);
    setSizeValue("");
    setSizeEstimate(null);
    setConditions(null);
    setNow(Date.now());
    setResetKey((k) => k + 1);
  }

  return (
    <form className="tag" onSubmit={handleStage}>
      <div className="tag__grommet" aria-hidden="true" />

      <header className="tag__header">
        <span className="tag__eyebrow">New entry</span>
        <h1 className="tag__title">Catch Log</h1>
        <time className="tag__timestamp" dateTime={new Date(now).toISOString()}>
          {formatTimestamp(now)}
        </time>
      </header>

      <div className="tag__divider" />

      <section className="tag__section">
        <CameraCapture
          photo={photo}
          onCapture={setPhoto}
          onClear={handleClearPhoto}
        />
      </section>

      <section className="tag__section">
        <label className="tag__label">Species</label>
        <SpeciesId
          photo={photo}
          species={species}
          confirmed={speciesConfirmed}
          onChange={setSpecies}
          onConfirmedChange={setSpeciesConfirmed}
          onSizeEstimate={setSizeEstimate}
        />
      </section>

      <section className="tag__section">
        <label className="tag__label">
          Size <span className="tag__label-hint">approx.</span>
        </label>
        <SizeInput
          value={sizeValue}
          unit={sizeUnit}
          onValueChange={setSizeValue}
          onUnitChange={setSizeUnit}
          estimate={sizeEstimate}
        />
      </section>

      <section className="tag__section">
        <label className="tag__label">Spot</label>
        <LocationCapture
          key={resetKey}
          location={location}
          onLocate={setLocation}
          onSkip={() => setLocation(null)}
        />
      </section>

      <section className="tag__section">
        <label className="tag__label">Conditions</label>
        <ConditionsCapture
          key={resetKey}
          location={location}
          onConditions={setConditions}
        />
      </section>

      <section className="tag__section">
        <label className="tag__label" htmlFor="note">
          Note <span className="tag__label-hint">optional</span>
        </label>
        <textarea
          id="note"
          className="tag__textarea"
          placeholder="Where it hit, what it was biting on, anything worth remembering…"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </section>

      <p className="tag__roadmap">Saved on this device once staged.</p>

      <button type="submit" className="tag__submit" disabled={!photo}>
        Stage this catch
      </button>
    </form>
  );
}
