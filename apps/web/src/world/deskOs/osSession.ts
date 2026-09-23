import { useReducer } from "react";
import type { OpenableFile } from "./os/FileExplorer.js";
import {
  initialBrowserHistory,
  reduceBrowserHistory,
  type BrowserHistory,
  type BrowserHistoryAction,
  type OsAppId,
} from "./os/browserState.js";
import {
  initialFakeFs,
  moveFile,
  type FakeFs,
  type FsFolderId,
} from "./os/useFakeFs.js";

/**
 * Client-local workstation session slice (A1).
 *
 * Owned above the LaptopOverlay → DeskOs mount path so leave/return and later
 * multi-window work do not depend on React mount lifetime. Never persisted;
 * never sent to the server; never evidence.
 */
export interface OsSessionState {
  activeApp: OsAppId;
  openFile: OpenableFile | null;
  fakeFs: FakeFs;
  browserHistory: BrowserHistory;
  scratchNotes: string;
}

export type OsSessionAction =
  | { type: "set_active_app"; app: OsAppId }
  | { type: "set_open_file"; file: OpenableFile | null }
  | { type: "open_file_in_notes"; file: OpenableFile }
  | { type: "set_fake_fs"; fs: FakeFs }
  | { type: "move_fake_file"; fileId: string; toFolder: FsFolderId }
  | { type: "browser"; action: BrowserHistoryAction }
  | { type: "set_scratch_notes"; text: string };

/** Pure initializer — matches pre-A1 DeskOs component defaults. */
export function createInitialOsSession(): OsSessionState {
  return {
    activeApp: "browser",
    openFile: null,
    fakeFs: initialFakeFs(),
    browserHistory: initialBrowserHistory("ops"),
    scratchNotes: "",
  };
}

/** Pure reducer — no I/O, no globals, no canonical actions. */
export function reduceOsSession(
  state: OsSessionState,
  action: OsSessionAction,
): OsSessionState {
  switch (action.type) {
    case "set_active_app":
      return state.activeApp === action.app
        ? state
        : { ...state, activeApp: action.app };
    case "set_open_file":
      return state.openFile === action.file
        ? state
        : { ...state, openFile: action.file };
    case "open_file_in_notes":
      return { ...state, openFile: action.file, activeApp: "notes" };
    case "set_fake_fs":
      return state.fakeFs === action.fs
        ? state
        : { ...state, fakeFs: action.fs };
    case "move_fake_file": {
      const nextFs = moveFile(state.fakeFs, action.fileId, action.toFolder);
      return nextFs === state.fakeFs ? state : { ...state, fakeFs: nextFs };
    }
    case "browser": {
      const nextHistory = reduceBrowserHistory(
        state.browserHistory,
        action.action,
      );
      return nextHistory === state.browserHistory
        ? state
        : { ...state, browserHistory: nextHistory };
    }
    case "set_scratch_notes":
      return state.scratchNotes === action.text
        ? state
        : { ...state, scratchNotes: action.text };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/**
 * Session-scoped owner hook. One instance per React tree that calls it —
 * no module-level singleton. Fresh Career Expo session = fresh OS session.
 */
export function useOsSessionState(): [
  OsSessionState,
  (action: OsSessionAction) => void,
] {
  return useReducer(reduceOsSession, undefined, createInitialOsSession);
}
