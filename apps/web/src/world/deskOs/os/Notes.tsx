import { useState } from "react";
import type { OpenableFile } from "./FileExplorer.js";

export function Notes({ openFile }: { openFile: OpenableFile | null }) {
  const [text, setText] = useState("");
  return (
    <section aria-label="Notes" className="os-window os-notes">
      <p className="eyebrow">Scratch pad</p>
      <h3 className="os-notes-title">Notes</h3>
      {openFile ? (
        <article aria-label={`Opened file ${openFile.name}`} className="os-open-file">
          <p className="os-open-file-name">{openFile.name}</p>
          <p className="os-open-file-body">{openFile.body}</p>
        </article>
      ) : null}
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
