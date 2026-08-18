import { useState } from "react";
import SpeciesId from "./SpeciesId";
import SizeInput from "./SizeInput";
import "./CatchEditForm.css";
/**
 * Inline edit form for an already-logged catch. Reuses SpeciesId and
 * SizeInput so re-running Claude's identification against the original
 * photo works exactly like it does when staging a new catch. Photo,
 * location, and conditions are locked — only species, size, and note
 * are editable.
 *
 * @param {{ catchEntry: import("../lib/catchModel").Catch,
 *           onSave: (updated: import("../lib/catchModel").Catch) => void,
 *           onCancel: () => void }} props
 */
export default function CatchEditForm({ catchEntry, onSave, onCancel }) {
  const [species, setSpecies] = useState(catchEntry.species || "");
  const [speciesConfirmed, setSpeciesConfirmed] = useState(true);
  const [sizeValue, setSizeValue] = useState(
    catchEntry.sizeApprox ? String(catchEntry.sizeApprox.value) : ""
  );
  const [sizeUnit, setSizeUnit] = useState(catchEntry.sizeApprox?.unit || "in");
  const [note, setNote] = useState(catchEntry.note || "");
  const [sizeEstimate, setSizeEstimate] = useState(null);
  function handleSpeciesChange(value) {
    setSpecies(value);
    setSpeciesConfirmed(false);
  }
  function handleSave(e) {
    e.preventDefault();
    onSave({
      ...catchEntry,
      species: species.trim(),
      sizeApprox: sizeValue ? { value: Number(sizeValue), unit: sizeUnit } : null,
      note: note.trim(),
    });
  }
  return (
    <form className="editCatch" onSubmit={handleSave}>
      <div className="editCatch__section">
        <label className="editCatch__label">Species</label>
        <SpeciesId
          photo={catchEntry.photo}
          species={species}
          confirmed={speciesConfirmed}
          onChange={handleSpeciesChange}
          onConfirmedChange={setSpeciesConfirmed}
          onSizeEstimate={setSizeEstimate}
        />
      </div>
      <div className="editCatch__section">
        <label className="editCatch__label">Size</label>
        <SizeInput
          value={sizeValue}
          unit={sizeUnit}
          onValueChange={setSizeValue}
          onUnitChange={setSizeUnit}
          estimate={sizeEstimate}
        />
      </div>
      <div className="editCatch__section">
        <label className="editCatch__label" htmlFor="editNote">
          Note
        </label>
        <textarea
          id="editNote"
          className="editCatch__textarea"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="editCatch__actions">
        <button type="submit" className="btn btn--brass">
          Save changes
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
