import { useOsSession, type OpenableFile } from "../osSession.js";
import { fileKindLabel } from "./useFakeFs.js";

export function Notes({ openFile }: { openFile: OpenableFile | null }) {
  const { state, dispatch } = useOsSession();
  const text = state.notesText;
  return (
    <section aria-label="Notes" className="os-window os-notes">
      <p className="eyebrow">Scratch pad</p>
      <h3 className="os-notes-title">Notes</h3>
      {openFile ? (
        <article
          aria-label={`Opened file ${openFile.name}`}
          className="os-open-file"
          data-filetype={openFile.kind}
        >
          <p className="os-open-file-name">
            {openFile.name}
            <span className="os-open-file-kind">
              {fileKindLabel(openFile.kind)}
            </span>
          </p>
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
          dispatch({ type: "set_notes_text", text: event.target.value });
        }}
        placeholder="Jot a reminder — private to this workstation."
        rows={8}
        value={text}
      />
      <p className="os-status-note">
        Scratch notes, separate from the case ticket.
      </p>
    </section>
  );
}
