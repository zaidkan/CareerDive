import { useState } from "react";
import { useOsSession, type OpenableFile } from "../osSession.js";
import { findFileFolder, moveFile, type FsFile, type FsFolderId } from "./useFakeFs.js";

const DROP_MIME = "text/os-file-id";

export type { OpenableFile };

function fileTypeOf(name: string): string {
  if (name.endsWith(".txt")) return "text";
  return "file";
}

export function FileExplorer({ onOpenFile }: { onOpenFile: (file: OpenableFile) => void }) {
  const { state, dispatch } = useOsSession();
  const fs = state.fakeFs;
  const [folder, setFolder] = useState<FsFolderId>("documents");
  const [selected, setSelected] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<string | null>(null);
  const [notice, setNotice] = useState("File moves stay on this workstation.");
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
    dispatch({ type: "set_fake_fs", fs: moveFile(fs, fileId, toFolder) });
    if (fileId === "field-notes-draft.txt" && toFolder === "desktop") {
      setNotice(`Moved ${name} to Desktop. Nice — a tidy desktop.`);
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

  const openSelected = () => {
    if (!selected) return;
    const holder = findFileFolder(fs, selected) ?? folder;
    const file: FsFile | undefined = fs.filesByFolder[holder].find((entry) => entry.id === selected);
    if (file) onOpenFile({ id: file.id, name: file.name, body: file.body });
  };

  return (
    <section aria-label="File Explorer" className="os-window os-files">
      <div className="os-toolbar" role="group" aria-label="File actions">
        <button className="desk-os-ghost" disabled={!selected} onClick={openSelected} type="button">
          Open
        </button>
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
                aria-describedby="os-file-open-hint"
                aria-pressed={selected === file.id}
                className={`os-file${selected === file.id ? " os-file-selected" : ""}`}
                data-filetype={fileTypeOf(file.name)}
                draggable
                onClick={() => {
                  setSelected((current) => (current === file.id ? null : file.id));
                }}
                onDoubleClick={() => {
                  onOpenFile({ id: file.id, name: file.name, body: file.body });
                }}
                onDragStart={(event) => {
                  event.dataTransfer.setData(DROP_MIME, file.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onKeyDown={(event) => {
                  // Enter opens; Space keeps native button behavior (select).
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onOpenFile({ id: file.id, name: file.name, body: file.body });
                  }
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
        <span className="visually-hidden" id="os-file-open-hint">
          Press Enter to open in Notes, Space to select for Cut and Paste.
        </span>
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
