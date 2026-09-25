import { useState, type DragEvent } from "react";
import { useOsSession, type OpenableFile } from "../osSession.js";
import {
  FS_ROOT_LABEL,
  childFolders,
  fileKindLabel,
  findFile,
  findFileFolder,
  folderById,
  folderPath,
  moveFile,
  parentFolderId,
  resolveFolderId,
  topLevelFolders,
  type FakeFs,
  type FsFile,
  type FsFolderId,
} from "./useFakeFs.js";

const DROP_MIME = "text/os-file-id";

export type { OpenableFile };

function toOpenable(file: FsFile): OpenableFile {
  return { id: file.id, name: file.name, body: file.body, kind: file.kind };
}

function labelOf(fs: FakeFs, id: FsFolderId): string {
  return folderById(fs, id)?.label ?? id;
}

function itemCount(fs: FakeFs, id: FsFolderId): number {
  return (fs.filesByFolder[id] ?? []).length + childFolders(fs, id).length;
}

export function FileExplorer({
  onOpenFile,
}: {
  onOpenFile: (file: OpenableFile) => void;
}) {
  const { state, dispatch } = useOsSession();
  const fs = state.fakeFs;
  const folder = resolveFolderId(fs, state.explorerFolder);
  const selected = state.explorerSelected;
  const selectedFile = selected ? findFile(fs, selected) : null;
  const selectedId = selectedFile ? selected : null;
  const clipboard = state.filesClipboard;
  const setClipboard = (fileId: string | null) => {
    dispatch({ type: "set_files_clipboard", fileId });
  };
  const [notice, setNotice] = useState("File moves stay on this workstation.");
  const [dropTarget, setDropTarget] = useState<FsFolderId | null>(null);

  const current = folderById(fs, folder);
  const crumbs = folderPath(fs, folder);
  const parent = parentFolderId(fs, folder);
  const files = fs.filesByFolder[folder] ?? [];
  const subfolders = childFolders(fs, folder);
  const folderLabel = current?.label ?? folder;
  const selectedName = selectedFile?.name ?? null;

  const setFolder = (next: FsFolderId) => {
    dispatch({ type: "set_explorer_folder", folder: next });
    dispatch({ type: "set_explorer_selected", fileId: null });
  };

  const relocate = (fileId: string, toFolder: FsFolderId) => {
    const fromFolder = findFileFolder(fs, fileId);
    if (!fromFolder || fromFolder === toFolder) return;
    const name = findFile(fs, fileId)?.name ?? fileId;
    dispatch({ type: "set_fake_fs", fs: moveFile(fs, fileId, toFolder) });
    if (fileId === "field-notes-draft.txt" && toFolder === "desktop") {
      setNotice(`Moved ${name} to Desktop. Nice — a tidy desktop.`);
    } else {
      setNotice(
        `Moved ${name} from ${labelOf(fs, fromFolder)} to ${labelOf(fs, toFolder)}.`,
      );
    }
    if (fileId === selectedId) {
      dispatch({ type: "set_explorer_selected", fileId: null });
    }
  };

  const cut = () => {
    if (!selectedId) return;
    setClipboard(selectedId);
    setNotice(`${selectedName ?? "File"} cut. Choose a folder, then Paste.`);
  };

  const paste = () => {
    if (!clipboard) return;
    relocate(clipboard, folder);
    setClipboard(null);
  };

  const openFileById = (fileId: string) => {
    const file = findFile(fs, fileId);
    if (file) onOpenFile(toOpenable(file));
  };

  const handleDrop = (event: DragEvent<HTMLElement>, toFolder: FsFolderId) => {
    event.preventDefault();
    setDropTarget(null);
    const fileId = event.dataTransfer.getData(DROP_MIME);
    if (fileId) relocate(fileId, toFolder);
  };

  return (
    <section aria-label="File Explorer" className="os-window os-files">
      <div className="os-toolbar" role="group" aria-label="File actions">
        <button
          aria-label="Go up one folder"
          className="desk-os-ghost"
          disabled={!parent}
          onClick={() => {
            if (parent) setFolder(parent);
          }}
          type="button"
        >
          ↑ Up
        </button>
        <nav aria-label="Folder path" className="os-path">
          <span className="os-path-root">{FS_ROOT_LABEL}</span>
          {crumbs.map((crumb) => (
            <span className="os-path-segment" key={crumb.id}>
              <span aria-hidden="true" className="os-path-sep">
                /
              </span>
              <button
                aria-current={
                  crumb.id === folder ? "page" : undefined
                }
                className="os-path-crumb"
                onClick={() => {
                  setFolder(crumb.id);
                }}
                type="button"
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>
        <button
          className="desk-os-ghost"
          disabled={!selectedId}
          onClick={() => {
            if (selectedId) openFileById(selectedId);
          }}
          type="button"
        >
          Open
        </button>
        <button className="desk-os-ghost" disabled={!selectedId} onClick={cut} type="button">
          Cut
        </button>
        <button className="desk-os-ghost" disabled={!clipboard} onClick={paste} type="button">
          Paste here
        </button>
      </div>
      <div className="os-files-body">
        <div className="os-folders" role="group" aria-label="Folders">
          {topLevelFolders(fs).map((entry) => {
            const inside = crumbs.some((crumb) => crumb.id === entry.id);
            return (
              <button
                aria-pressed={inside}
                className={`os-folder${inside ? " os-folder-active" : ""}${dropTarget === entry.id ? " os-folder-drop" : ""}`}
                key={entry.id}
                onClick={() => {
                  setFolder(entry.id);
                }}
                onDragOver={(event: DragEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                  setDropTarget(entry.id);
                }}
                onDragLeave={() => {
                  setDropTarget((currentId) =>
                    currentId === entry.id ? null : currentId,
                  );
                }}
                onDrop={(event) => {
                  handleDrop(event, entry.id);
                }}
                type="button"
              >
                {entry.label}
                <span className="os-folder-count">{itemCount(fs, entry.id)}</span>
              </button>
            );
          })}
        </div>
        <ul aria-label={`Files in ${folderLabel}`} className="os-file-list">
          {subfolders.map((entry) => (
            <li key={entry.id}>
              <button
                className="os-file os-folder-entry"
                data-filetype="folder"
                onClick={() => {
                  setFolder(entry.id);
                }}
                type="button"
              >
                <strong>{entry.label}/</strong>
                <span>
                  Folder · {itemCount(fs, entry.id)} items
                </span>
              </button>
            </li>
          ))}
          {files.map((file) => (
            <li key={file.id}>
              <button
                aria-describedby="os-file-open-hint"
                aria-pressed={selectedId === file.id}
                className={`os-file${selectedId === file.id ? " os-file-selected" : ""}`}
                data-filetype={file.kind}
                draggable
                onClick={() => {
                  dispatch({
                    type: "set_explorer_selected",
                    fileId: selectedId === file.id ? null : file.id,
                  });
                }}
                onDoubleClick={() => {
                  onOpenFile(toOpenable(file));
                }}
                onDragStart={(event) => {
                  event.dataTransfer.setData(DROP_MIME, file.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onKeyDown={(event) => {
                  // Enter opens; Space keeps native button behavior (select).
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onOpenFile(toOpenable(file));
                  }
                }}
                type="button"
              >
                <strong>{file.name}</strong>
                <span>
                  {fileKindLabel(file.kind)} · {file.body.split("\n").length} lines
                </span>
              </button>
            </li>
          ))}
          {subfolders.length === 0 && files.length === 0 ? (
            <li className="os-file-empty">Empty folder.</li>
          ) : null}
        </ul>
        <span className="visually-hidden" id="os-file-open-hint">
          Press Enter to open in Notes, Space to select for Cut and Paste.
        </span>
      </div>
      {selectedFile ? <p className="os-file-preview">{selectedFile.body}</p> : null}
      <p aria-live="polite" className="os-status-note" role="status">
        {notice}
      </p>
    </section>
  );
}
