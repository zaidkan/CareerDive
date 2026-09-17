import { useState } from "react";
import { findFileFolder, initialFakeFs, moveFile, type FakeFs, type FsFolderId } from "./useFakeFs.js";

const DROP_MIME = "text/os-file-id";

export function FileExplorer() {
  const [fs, setFs] = useState<FakeFs>(() => initialFakeFs());
  const [folder, setFolder] = useState<FsFolderId>("documents");
  const [selected, setSelected] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<string | null>(null);
  const [notice, setNotice] = useState("File moves stay on this workstation. They never affect shift state or evidence.");
  const [dropTarget, setDropTarget] = useState<FsFolderId | null>(null);

  const folderLabel = (id: FsFolderId) => fs.folders.find((entry) => entry.id === id)?.label ?? id;
  const selectedName = selected
    ? (findFileFolder(fs, selected)
      ? fs.filesByFolder[findFileFolder(fs, selected) ?? "documents"].find((file) => file.id === selected)?.name
      : null)
    : null;

  const relocate = (fileId: string, toFolder: FsFolderId) => {
    const fromFolder = findFileFolder(fs, fileId);
    if (!fromFolder || fromFolder === toFolder) return;
    const name = fs.filesByFolder[fromFolder].find((file) => file.id === fileId)?.name ?? fileId;
    setFs((current) => moveFile(current, fileId, toFolder));
    if (fileId === "field-notes-draft.txt" && toFolder === "desktop") {
      setNotice(`Moved ${name} to Desktop. Nice — a tidy desktop. Cosmetic only; the shift does not track files.`);
    } else {
      setNotice(`Moved ${name} from ${folderLabel(fromFolder)} to ${folderLabel(toFolder)}.`);
    }
  };

  const cut = () => {
    if (selected) {
      setClipboard(selected);
      setNotice(`${selectedName ?? "File"} cut. Choose a folder, then Paste.`);
    }
  };

  const paste = () => {
    if (!clipboard) return;
    relocate(clipboard, folder);
    setClipboard(null);
    setSelected(null);
  };

  return (
    <section aria-label="File Explorer" className="os-window os-files">
      <div className="os-toolbar" role="group" aria-label="File actions">
        <button className="desk-os-ghost" disabled={!selected} onClick={cut} type="button">
          Cut
        </button>
        <button className="desk-os-ghost" disabled={!clipboard} onClick={paste} type="button">
          Paste here
        </button>
      </div>
      <div className="os-files-body">
        <div className="os-folders" role="group" aria-label="Folders">
          {fs.folders.map((entry) => (
            <button
              aria-pressed={folder === entry.id}
              className={`os-folder${folder === entry.id ? " os-folder-active" : ""}${dropTarget === entry.id ? " os-folder-drop" : ""}`}
              key={entry.id}
              onClick={() => {
                setFolder(entry.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget(entry.id);
              }}
              onDragLeave={() => {
                setDropTarget((current) => (current === entry.id ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDropTarget(null);
                const fileId = event.dataTransfer.getData(DROP_MIME);
                if (fileId) relocate(fileId, entry.id);
              }}
              type="button"
            >
              {entry.label}
              <span className="os-folder-count">{fs.filesByFolder[entry.id].length}</span>
            </button>
          ))}
        </div>
        <ul aria-label={`Files in ${folderLabel(folder)}`} className="os-file-list">
          {fs.filesByFolder[folder].map((file) => (
            <li key={file.id}>
              <button
                aria-pressed={selected === file.id}
                className={`os-file${selected === file.id ? " os-file-selected" : ""}`}
                draggable
                onClick={() => {
                  setSelected((current) => (current === file.id ? null : file.id));
                }}
                onDragStart={(event) => {
                  event.dataTransfer.setData(DROP_MIME, file.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                type="button"
              >
                <strong>{file.name}</strong>
                <span>{file.body.split("\n")[0]}</span>
              </button>
            </li>
          ))}
          {fs.filesByFolder[folder].length === 0 ? (
            <li className="os-file-empty">Empty folder.</li>
          ) : null}
        </ul>
      </div>
      {selected ? (
        <p className="os-file-preview">
          {fs.filesByFolder[findFileFolder(fs, selected) ?? folder].find((file) => file.id === selected)?.body}
        </p>
      ) : null}
      <p aria-live="polite" className="os-status-note" role="status">
        {notice}
      </p>
    </section>
  );
}
