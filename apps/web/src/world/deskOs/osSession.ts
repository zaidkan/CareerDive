import {
  createContext,
  createElement,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { BrowserNav, OsAppId } from "./os/browserState.js";
import {
  closeWindow, focusWindow, initialWindowState, maximizeWindow, minimizeWindow,
  moveWindow, openWindow, restoreMaximizedWindow, restoreWindow,
  selectTaskbarWindow, type WindowState, type WorkspaceSize,
} from "./os/windows.js";
import {
  FS_FALLBACK_FOLDER,
  initialFakeFs,
  type FakeFs,
  type FsFileKind,
  type FsFolderId,
} from "./os/useFakeFs.js";

export interface OpenableFile {
  id: string;
  name: string;
  body: string;
  kind: FsFileKind;
}

export interface BrowserHistory {
  entries: BrowserNav[];
  index: number;
}

function sameNav(a: BrowserNav, b: BrowserNav): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "page" && b.kind === "page") return a.page === b.page;
  if (a.kind === "blocked" && b.kind === "blocked") return a.url === b.url;
  return false;
}

/**
 * Session-scoped Desk OS runtime state. Lives above the `LaptopOverlay → DeskOs`
 * mount so leave/return does not depend on React mount lifetime. Never canonical
 * evidence/assessment/time/actions.
 */
export interface OsSessionState {
  windows: WindowState;
  openFile: OpenableFile | null;
  fakeFs: FakeFs;
  browserHistories: Record<string, BrowserHistory>;
  notesText: string;
  morganIntroSeen: boolean;
  /** File Explorer folder + selection survive DeskOs remounts (session-scoped). */
  explorerFolder: FsFolderId;
  explorerSelected: string | null;
}

export type OsSessionAction =
  | { type: "open_window"; app: OsAppId; workspace?: WorkspaceSize }
  | { type: "focus_window"; id: string }
  | { type: "move_window"; id: string; x: number; y: number; workspace: WorkspaceSize }
  | { type: "minimize_window"; id: string }
  | { type: "restore_window"; id: string }
  | { type: "maximize_window"; id: string }
  | { type: "restore_maximized_window"; id: string }
  | { type: "close_window"; id: string }
  | { type: "select_taskbar_window"; id: string }
  | { type: "set_open_file"; file: OpenableFile | null }
  | { type: "set_fake_fs"; fs: FakeFs }
  | { type: "browser_navigate"; windowId: string; nav: BrowserNav }
  | { type: "browser_back"; windowId: string }
  | { type: "browser_forward"; windowId: string }
  | { type: "set_notes_text"; text: string }
  | { type: "mark_morgan_intro_seen" }
  | { type: "set_explorer_folder"; folder: FsFolderId }
  | { type: "set_explorer_selected"; fileId: string | null };

export function createInitialOsSession(): OsSessionState {
  return {
    windows: initialWindowState(),
    openFile: null,
    fakeFs: initialFakeFs(),
    browserHistories: { "window-1": { entries: [{ kind: "page", page: "ops" }], index: 0 } },
    notesText: "",
    morganIntroSeen: false,
    explorerFolder: FS_FALLBACK_FOLDER,
    explorerSelected: null,
  };
}

export function osSessionReducer(
  state: OsSessionState,
  action: OsSessionAction,
): OsSessionState {
  switch (action.type) {
    case "open_window": {
      const windows = openWindow(state.windows, action.app, action.workspace);
      const id = windows.focusedWindowId;
      return {
        ...state,
        windows,
        browserHistories: id && !state.browserHistories[id] && windows.windows.find((window) => window.id === id)?.app === "browser"
          ? { ...state.browserHistories, [id]: { entries: [{ kind: "page", page: "ops" }], index: 0 } }
          : state.browserHistories,
      };
    }
    case "focus_window":
      return { ...state, windows: focusWindow(state.windows, action.id) };
    case "move_window":
      return { ...state, windows: moveWindow(state.windows, action.id, action.x, action.y, action.workspace) };
    case "minimize_window":
      return { ...state, windows: minimizeWindow(state.windows, action.id) };
    case "restore_window":
      return { ...state, windows: restoreWindow(state.windows, action.id) };
    case "maximize_window":
      return { ...state, windows: maximizeWindow(state.windows, action.id) };
    case "restore_maximized_window":
      return { ...state, windows: restoreMaximizedWindow(state.windows, action.id) };
    case "close_window": {
      const browserHistories = Object.fromEntries(
        Object.entries(state.browserHistories).filter(([id]) => id !== action.id),
      );
      return { ...state, windows: closeWindow(state.windows, action.id), browserHistories };
    }
    case "select_taskbar_window":
      return { ...state, windows: selectTaskbarWindow(state.windows, action.id) };
    case "set_open_file":
      return state.openFile === action.file
        ? state
        : { ...state, openFile: action.file };
    case "set_fake_fs":
      return state.fakeFs === action.fs ? state : { ...state, fakeFs: action.fs };
    case "browser_navigate": {
      const history = state.browserHistories[action.windowId];
      if (!history) return state;
      const base = history.entries.slice(
        0,
        history.index + 1,
      );
      const top = base[base.length - 1];
      if (top && sameNav(top, action.nav)) return state;
      const entries = [...base, action.nav];
      return {
        ...state,
        browserHistories: { ...state.browserHistories, [action.windowId]: { entries, index: entries.length - 1 } },
      };
    }
    case "browser_back": {
      const history = state.browserHistories[action.windowId];
      if (!history) return state;
      return {
        ...state,
        browserHistories: { ...state.browserHistories, [action.windowId]: { ...history, index: Math.max(0, history.index - 1) } },
      };
    }
    case "browser_forward": {
      const history = state.browserHistories[action.windowId];
      if (!history) return state;
      return {
        ...state,
        browserHistories: { ...state.browserHistories, [action.windowId]: {
          ...history,
          index: Math.min(
            history.entries.length - 1,
            history.index + 1,
          ),
        } },
      };
    }
    case "set_notes_text":
      return state.notesText === action.text
        ? state
        : { ...state, notesText: action.text };
    case "mark_morgan_intro_seen":
      return state.morganIntroSeen
        ? state
        : { ...state, morganIntroSeen: true };
    case "set_explorer_folder":
      return state.explorerFolder === action.folder
        ? state
        : { ...state, explorerFolder: action.folder };
    case "set_explorer_selected":
      return state.explorerSelected === action.fileId
        ? state
        : { ...state, explorerSelected: action.fileId };
    default:
      return state;
  }
}

interface OsSessionContextValue {
  state: OsSessionState;
  dispatch: Dispatch<OsSessionAction>;
}

const OsSessionContext = createContext<OsSessionContextValue | null>(null);

/** One provider per Career Expo session — no global singleton. */
export function OsSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    osSessionReducer,
    undefined,
    createInitialOsSession,
  );
  return createElement(
    OsSessionContext.Provider,
    { value: { state, dispatch } },
    children,
  );
}

export function useOsSession(): OsSessionContextValue {
  const value = useContext(OsSessionContext);
  if (!value) {
    throw new Error("useOsSession requires an OsSessionProvider ancestor");
  }
  return value;
}

/** For tools also rendered outside Desk OS (tests, accessibility recovery). */
export function useOptionalOsSession(): OsSessionContextValue | null {
  return useContext(OsSessionContext);
}
