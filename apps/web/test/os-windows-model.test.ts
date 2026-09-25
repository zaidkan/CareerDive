import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MAX_OPEN_WINDOWS, canOpenWindow, clampWindowBounds, closeWindow,
  emptyWindowState, focusWindow, maximizeWindow, minimizeWindow, moveWindow,
  openWindow, restoreMaximizedWindow, restoreWindow, selectTaskbarWindow,
  type WindowState,
} from "../src/world/deskOs/os/windows.js";

const workspace = { w: 800, h: 600 };
const byId = (state: WindowState, id: string) => state.windows.find((window) => window.id === id);
const invariant = (state: WindowState) => {
  expect(state.windows.length).toBeLessThanOrEqual(MAX_OPEN_WINDOWS);
  expect(state.windows.filter((window) => window.app === "browser").length).toBeLessThanOrEqual(2);
  expect(state.windows.filter((window) => window.app === "files").length).toBeLessThanOrEqual(1);
  expect(state.windows.filter((window) => window.app === "notes").length).toBeLessThanOrEqual(1);
  expect(new Set(state.windows.map((window) => window.z)).size).toBe(state.windows.length);
  expect(state.windows.some((window) => window.app === ("desktop" as never))).toBe(false);
  const top = state.windows.filter((window) => !window.minimized).sort((a, b) => b.z - a.z)[0];
  expect(state.focusedWindowId).toBe(top?.id ?? null);
};

describe("pure Desk OS window model", () => {
  it("opens deterministic IDs, focuses with unique z, and keeps desktop out", () => {
    let state = emptyWindowState();
    expect(openWindow(state, "desktop")).toBe(state);
    state = openWindow(state, "browser", workspace);
    expect(state.windows.map((window) => window.id)).toEqual(["window-1"]);
    state = openWindow(state, "files", workspace);
    expect(state.windows.map((window) => window.id)).toEqual(["window-1", "window-2"]);
    expect(state.focusedWindowId).toBe("window-2");
    const z = state.nextZ;
    state = focusWindow(state, "window-1");
    expect(byId(state, "window-1")?.z).toBe(z);
    invariant(state);
  });

  it("retains minimized records, restores, toggles taskbar focus, and closes", () => {
    let state = openWindow(openWindow(emptyWindowState(), "browser"), "files");
    state = minimizeWindow(state, "window-2");
    expect(byId(state, "window-2")?.minimized).toBe(true);
    expect(state.focusedWindowId).toBe("window-1");
    state = restoreWindow(state, "window-2");
    expect(state.focusedWindowId).toBe("window-2");
    state = selectTaskbarWindow(state, "window-2");
    expect(byId(state, "window-2")?.minimized).toBe(true);
    state = selectTaskbarWindow(state, "window-2");
    expect(state.focusedWindowId).toBe("window-2");
    state = selectTaskbarWindow(state, "window-1");
    expect(state.focusedWindowId).toBe("window-1");
    state = closeWindow(state, "window-1");
    expect(state.windows.map((window) => window.id)).toEqual(["window-2"]);
    invariant(state);
  });

  it("maximizes without overwriting restore bounds; clamps moves to reachable title bar", () => {
    let state = openWindow(emptyWindowState(), "notes", workspace);
    const initial = byId(state, "window-1")?.bounds;
    state = maximizeWindow(state, "window-1");
    expect(byId(state, "window-1")?.maximized).toBe(true);
    state = moveWindow(state, "window-1", 9999, 9999, workspace);
    expect(byId(state, "window-1")?.bounds).toEqual(initial);
    state = restoreMaximizedWindow(state, "window-1");
    state = moveWindow(state, "window-1", 9999, 9999, workspace);
    expect(byId(state, "window-1")?.bounds).toMatchObject({ x: 752, y: 552 });
    expect(clampWindowBounds({ x: -9999, y: -9999, w: 480, h: 420 }, workspace)).toMatchObject({ x: -432, y: 0 });
    invariant(state);
  });

  it("enforces Browser 2, Files 1, Notes 1, and global 4 without eviction", () => {
    let state = emptyWindowState();
    for (const app of ["browser", "browser", "files", "notes"] as const) {
      state = openWindow(state, app, workspace);
      invariant(state);
    }
    expect(state.windows).toHaveLength(4);
    expect(canOpenWindow(state, "browser")).toBe(false);
    expect(openWindow(state, "browser", workspace)).toBe(state);
    expect(openWindow(state, "desktop", workspace)).toBe(state);
    state = minimizeWindow(state, "window-4");
    expect(openWindow(state, "browser", workspace)).toBe(state);
    state = openWindow(state, "files", workspace);
    expect(state.windows).toHaveLength(4);
    expect(state.focusedWindowId).toBe("window-3");
    state = openWindow(state, "notes", workspace);
    expect(state.windows).toHaveLength(4);
    expect(state.focusedWindowId).toBe("window-4");
    invariant(state);
  });

  it("imports no canonical runtime or mutation API", () => {
    const source = readFileSync(new URL("../src/world/deskOs/os/windows.ts", import.meta.url), "utf8");
    expect(source).toMatch(/^import type \{ OsAppId \} from "\.\/browserState\.js";/);
    expect(source).not.toMatch(/@sim\/|useMutationCoordinator|performAction|performWorkplaceInteraction/);
  });
});
