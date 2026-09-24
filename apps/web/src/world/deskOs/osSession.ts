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
  activeApp: OsAppId;
  openFile: OpenableFile | null;
  fakeFs: FakeFs;
  browserHistory: BrowserHistory;
  notesText: string;
  morganIntroSeen: boolean;
  /** File Explorer folder + selection survive DeskOs remounts (session-scoped). */
  explorerFolder: FsFolderId;
  explorerSelected: string | null;
}

export type OsSessionAction =
  | { type: "set_active_app"; app: OsAppId }
  | { type: "set_open_file"; file: OpenableFile | null }
  | { type: "set_fake_fs"; fs: FakeFs }
  | { type: "browser_navigate"; nav: BrowserNav }
  | { type: "browser_back" }
  | { type: "browser_forward" }
  | { type: "set_notes_text"; text: string }
  | { type: "mark_morgan_intro_seen" }
  | { type: "set_explorer_folder"; folder: FsFolderId }
  | { type: "set_explorer_selected"; fileId: string | null };

export function createInitialOsSession(): OsSessionState {
  return {
    activeApp: "browser",
    openFile: null,
    fakeFs: initialFakeFs(),
    browserHistory: { entries: [{ kind: "page", page: "ops" }], index: 0 },
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
    case "set_active_app":
      return state.activeApp === action.app
        ? state
        : { ...state, activeApp: action.app };
    case "set_open_file":
      return state.openFile === action.file
        ? state
        : { ...state, openFile: action.file };
    case "set_fake_fs":
      return state.fakeFs === action.fs ? state : { ...state, fakeFs: action.fs };
    case "browser_navigate": {
      const base = state.browserHistory.entries.slice(
        0,
        state.browserHistory.index + 1,
      );
      const top = base[base.length - 1];
      if (top && sameNav(top, action.nav)) return state;
      const entries = [...base, action.nav];
      return {
        ...state,
        browserHistory: { entries, index: entries.length - 1 },
      };
    }
    case "browser_back":
      return {
        ...state,
        browserHistory: {
          ...state.browserHistory,
          index: Math.max(0, state.browserHistory.index - 1),
        },
      };
    case "browser_forward":
      return {
        ...state,
        browserHistory: {
          ...state.browserHistory,
          index: Math.min(
            state.browserHistory.entries.length - 1,
            state.browserHistory.index + 1,
          ),
        },
      };
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
