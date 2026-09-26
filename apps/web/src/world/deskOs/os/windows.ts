import type { OsAppId } from "./browserState.js";

export const MAX_OPEN_WINDOWS = 4;
export const TITLE_BAR_REACH = 48;
/** Restored windows keep wallpaper visible on every side of the workspace. */
export const OPEN_MARGIN = 24;

export type WindowApp = Exclude<OsAppId, "desktop">;
export type WindowBounds = { x: number; y: number; w: number; h: number };
export type WorkspaceSize = { w: number; h: number };
export type WindowRecord = {
  id: string;
  app: WindowApp;
  minimized: boolean;
  maximized: boolean;
  bounds: WindowBounds;
  z: number;
};
export type WindowState = {
  windows: WindowRecord[];
  focusedWindowId: string | null;
  nextZ: number;
  nextId: number;
};

const APP_LIMITS: Record<OsAppId, number> = {
  desktop: 0,
  browser: 2,
  files: 1,
  notes: 1,
};
const DEFAULT_BOUNDS: Record<WindowApp, WindowBounds> = {
  browser: { x: 24, y: 20, w: 920, h: 640 },
  files: { x: 56, y: 52, w: 680, h: 500 },
  notes: { x: 88, y: 84, w: 480, h: 420 },
};

export function initialWindowState(): WindowState {
  return {
    windows: [{ id: "window-1", app: "browser", minimized: false, maximized: true, bounds: { ...DEFAULT_BOUNDS.browser }, z: 1 }],
    focusedWindowId: "window-1",
    nextZ: 2,
    nextId: 2,
  };
}

export function emptyWindowState(): WindowState {
  return { windows: [], focusedWindowId: null, nextZ: 1, nextId: 1 };
}

export function clampWindowBounds(bounds: WindowBounds, workspace: WorkspaceSize): WindowBounds {
  const w = Math.max(1, Math.min(bounds.w, workspace.w - 2 * OPEN_MARGIN));
  const h = Math.max(1, Math.min(bounds.h, workspace.h - 2 * OPEN_MARGIN));
  return {
    x: Math.min(Math.max(bounds.x, TITLE_BAR_REACH - w), Math.max(0, workspace.w - TITLE_BAR_REACH)),
    y: Math.min(Math.max(bounds.y, 0), Math.max(0, workspace.h - TITLE_BAR_REACH)),
    w,
    h,
  };
}

export function canOpenWindow(state: WindowState, app: OsAppId): boolean {
  if (app === "desktop") return false;
  if (app !== "browser" && state.windows.some((window) => window.app === app)) return true;
  return state.windows.length < MAX_OPEN_WINDOWS &&
    state.windows.filter((window) => window.app === app).length < APP_LIMITS[app];
}

export function focusWindow(state: WindowState, id: string): WindowState {
  const window = state.windows.find((entry) => entry.id === id);
  if (!window || window.minimized || state.focusedWindowId === id) return state;
  return {
    ...state,
    windows: state.windows.map((entry) => entry.id === id ? { ...entry, z: state.nextZ } : entry),
    focusedWindowId: id,
    nextZ: state.nextZ + 1,
  };
}

export function openWindow(state: WindowState, app: OsAppId, workspace?: WorkspaceSize): WindowState {
  if (app === "desktop") return state;
  const existing = app !== "browser" ? state.windows.find((window) => window.app === app) : undefined;
  if (existing) return restoreWindow(state, existing.id);
  if (!canOpenWindow(state, app)) return state;
  const id = `window-${String(state.nextId)}`;
  const bounds = { ...DEFAULT_BOUNDS[app], x: DEFAULT_BOUNDS[app].x + state.windows.length * 16, y: DEFAULT_BOUNDS[app].y + state.windows.length * 16 };
  return {
    windows: [...state.windows, { id, app, minimized: false, maximized: false, bounds: workspace ? clampWindowBounds(bounds, workspace) : bounds, z: state.nextZ }],
    focusedWindowId: id,
    nextZ: state.nextZ + 1,
    nextId: state.nextId + 1,
  };
}

export function moveWindow(state: WindowState, id: string, x: number, y: number, workspace: WorkspaceSize): WindowState {
  const window = state.windows.find((entry) => entry.id === id);
  if (!window || window.maximized || window.minimized) return state;
  const bounds = clampWindowBounds({ ...window.bounds, x, y }, workspace);
  return { ...state, windows: state.windows.map((entry) => entry.id === id ? { ...entry, bounds } : entry) };
}

function topVisibleId(windows: WindowRecord[]): string | null {
  return windows.filter((window) => !window.minimized).reduce<WindowRecord | null>(
    (top, window) => !top || window.z > top.z ? window : top,
    null,
  )?.id ?? null;
}

export function minimizeWindow(state: WindowState, id: string): WindowState {
  const window = state.windows.find((entry) => entry.id === id);
  if (!window || window.minimized) return state;
  const windows = state.windows.map((entry) => entry.id === id ? { ...entry, minimized: true } : entry);
  return { ...state, windows, focusedWindowId: topVisibleId(windows) };
}

export function restoreWindow(state: WindowState, id: string): WindowState {
  const window = state.windows.find((entry) => entry.id === id);
  if (!window) return state;
  if (!window.minimized) return focusWindow(state, id);
  return {
    ...state,
    windows: state.windows.map((entry) => entry.id === id ? { ...entry, minimized: false, z: state.nextZ } : entry),
    focusedWindowId: id,
    nextZ: state.nextZ + 1,
  };
}

export function maximizeWindow(state: WindowState, id: string): WindowState {
  const focused = restoreWindow(state, id);
  return { ...focused, windows: focused.windows.map((entry) => entry.id === id ? { ...entry, maximized: true } : entry) };
}

export function restoreMaximizedWindow(state: WindowState, id: string, workspace?: WorkspaceSize): WindowState {
  return {
    ...state,
    windows: state.windows.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            maximized: false,
            ...(workspace ? { bounds: clampWindowBounds(entry.bounds, workspace) } : {}),
          }
        : entry,
    ),
  };
}

export function closeWindow(state: WindowState, id: string): WindowState {
  if (!state.windows.some((entry) => entry.id === id)) return state;
  const windows = state.windows.filter((entry) => entry.id !== id);
  return { ...state, windows, focusedWindowId: topVisibleId(windows) };
}

export function selectTaskbarWindow(state: WindowState, id: string): WindowState {
  const window = state.windows.find((entry) => entry.id === id);
  if (!window) return state;
  if (window.minimized) return restoreWindow(state, id);
  if (state.focusedWindowId === id) return minimizeWindow(state, id);
  return focusWindow(state, id);
}
