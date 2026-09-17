import { useState } from "react";

export function Notes() {
  const [text, setText] = useState("");
  return (
    <section aria-label="Notes" className="os-window os-notes">
      <p className="eyebrow">Scratch pad</p>
      <h3 className="os-notes-title">Notes</h3>
      <label className="visually-hidden" htmlFor="os-scratch-notes">
        Scratch notes
      </label>
      <textarea
        className="os-notes-area"
        id="os-scratch-notes"
        onChange={(event) => {
          setText(event.target.value);
        }}
        placeholder="Jot a reminder. Notes stay here and are never assessed."
        rows={8}
        value={text}
      />
      <p className="os-status-note">Local scratch only — never part of shift evidence.</p>
    </section>
  );
}
