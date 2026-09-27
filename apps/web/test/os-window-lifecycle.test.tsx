// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import { createInitialOsSession, osSessionReducer, OsSessionProvider } from "../src/world/deskOs/osSession.js";

afterEach(cleanup);

function makeView(): ClientView {
  return {
    sessionId: "session-1", sessionKind: "assessed", simClock: 42,
    currentLocation: { id: "operations-center", name: "Security Operations Center", connectedLocationIds: [], interactableIds: [] },
    events: [], availableActions: [], operationalMessages: [], pacingMode: "standard",
    artifacts: [], ticketNotes: {}, notebook: "", kbQuery: "", tasks: [], notifications: [], queryResults: [],
    workplace: {
      energy: { current: 80, max: 100 }, carriedSnackBites: 0, fridgeSnackBars: 2,
      fridgeOpen: false, coffeeServings: 2, coffeeStage: "idle", julesTopicsSeen: [], emergencyRecoveryUsed: false,
    },
  };
}

function setup() {
  const onAction = vi.fn();
  const onTaskAttempt = vi.fn();
  const onNotification = vi.fn();
  const onWorkplaceInteraction = vi.fn();
  const result = render(
    <OsSessionProvider>
      <DeskOs
        phase="seated_monitor" view={makeView()} onAction={onAction}
        onTaskAttempt={onTaskAttempt} onNotification={onNotification}
        onWorkplaceInteraction={onWorkplaceInteraction}
        onLoginSuccess={() => undefined} onStand={() => undefined} onOsFullscreen={() => undefined}
      />
    </OsSessionProvider>,
  );
  const frame = (id: string) => {
    const element = result.container.querySelector<HTMLElement>(`[data-window-id="${id}"]`);
    if (!element) throw new Error(`Window ${id} missing`);
    return element;
  };
  const taskbar = (name: string) => within(screen.getByRole("group", { name: "Open windows" })).getByRole("button", { name });
  const pinned = (name: string) => within(screen.getByRole("group", { name: "Pinned apps" })).getByRole("button", { name });
  const expectNoCanonicalActions = () => {
    expect(onAction).not.toHaveBeenCalled();
    expect(onTaskAttempt).not.toHaveBeenCalled();
    expect(onNotification).not.toHaveBeenCalled();
    expect(onWorkplaceInteraction).not.toHaveBeenCalled();
  };
  return { frame, taskbar, pinned, expectNoCanonicalActions };
}

describe("per-window lifecycle", () => {
  it("disposes closed Browser state without clearing shared documents", () => {
    let state = createInitialOsSession();
    state = osSessionReducer(state, { type: "browser_navigate", windowId: "window-1", nav: { kind: "page", page: "intranet" } });
    state = osSessionReducer(state, { type: "set_ops_tab", windowId: "window-1", tab: "email" });
    state = osSessionReducer(state, { type: "set_browser_draft", windowId: "window-1", draft: "unfinished address" });
    state = osSessionReducer(state, { type: "set_notes_text", text: "keep this" });
    const sharedFs = state.fakeFs;
    state = osSessionReducer(state, { type: "close_window", id: "window-1" });
    expect(state.browserHistories["window-1"]).toBeUndefined();
    expect(state.browserDraftByWindow["window-1"]).toBeUndefined();
    expect(state.opsTabByWindow["window-1"]).toBeUndefined();
    expect(state.notesText).toBe("keep this");
    expect(state.fakeFs).toBe(sharedFs);
    state = osSessionReducer(state, { type: "open_window", app: "browser" });
    expect(state.windows.windows[0]?.id).toBe("window-2");
    expect(state.browserHistories["window-2"]).toEqual({ entries: [{ kind: "page", page: "ops" }], index: 0 });
    expect(state.opsTabByWindow["window-2"]).toBeUndefined();
    expect(state.browserDraftByWindow["window-2"]).toBeUndefined();
    state = osSessionReducer(state, { type: "open_window", app: "files" });
    state = osSessionReducer(state, { type: "set_files_clipboard", fileId: "shift-brief.txt" });
    state = osSessionReducer(state, { type: "close_window", id: "window-3" });
    expect(state.filesClipboard).toBeNull();
    expect(state.fakeFs).toBe(sharedFs);
  });

  it("keeps independent Browser histories through focus and minimize, then clears history on close", async () => {
    const user = userEvent.setup();
    const { frame, taskbar, pinned, expectNoCanonicalActions } = setup();
    await user.click(within(frame("window-1")).getByRole("button", { name: "Company intranet" }));
    await user.clear(within(frame("window-1")).getByLabelText("Address bar"));
    await user.type(within(frame("window-1")).getByLabelText("Address bar"), "unfinished address");
    await user.click(within(frame("window-1")).getByRole("button", { name: "Minimize Browser" }));
    expect(screen.queryByRole("region", { name: "Browser" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Open Browser" }));
    expect(within(frame("window-2")).getByLabelText("Address bar")).toHaveValue("verdaly://ops");
    await user.click(taskbar("Browser, minimized"));
    expect(within(frame("window-1")).getByLabelText("Address bar")).toHaveValue("unfinished address");
    expect(within(frame("window-1")).getByRole("button", { name: "Go back" })).toBeEnabled();
    expect(within(frame("window-2")).getByLabelText("Address bar")).toHaveValue("verdaly://ops");
    await user.click(within(frame("window-1")).getByRole("button", { name: "Close Browser" }));
    await user.click(pinned("Browser"));
    expect(within(frame("window-2")).getByLabelText("Address bar")).toHaveValue("verdaly://ops");
    await user.click(within(frame("window-2")).getByRole("button", { name: "Close Browser" }));
    await user.click(pinned("Browser"));
    expect(within(frame("window-3")).getByLabelText("Address bar")).toHaveValue("verdaly://ops");
    expect(within(frame("window-3")).getByRole("button", { name: "Go back" })).toBeDisabled();
    expectNoCanonicalActions();
  });

  it("keeps an Ops Console tab through minimize and resets it after close", async () => {
    const user = userEvent.setup();
    const { frame, taskbar, pinned, expectNoCanonicalActions } = setup();
    await user.click(within(frame("window-1")).getByRole("tab", { name: "Email" }));
    expect(within(frame("window-1")).getByRole("tab", { name: "Email" })).toHaveAttribute("aria-selected", "true");
    await user.click(within(frame("window-1")).getByRole("button", { name: "Minimize Browser" }));
    expect(screen.queryByRole("tab", { name: "Email" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Open Browser" }));
    await user.click(within(frame("window-2")).getByRole("tab", { name: "Alerts" }));
    await user.click(taskbar("Browser, minimized"));
    expect(within(frame("window-1")).getByRole("tab", { name: "Email" })).toHaveAttribute("aria-selected", "true");
    expect(within(frame("window-2")).getByRole("tab", { name: "Alerts" })).toHaveAttribute("aria-selected", "true");
    await user.click(within(frame("window-1")).getByRole("button", { name: "Close Browser" }));
    await user.click(within(frame("window-2")).getByRole("button", { name: "Close Browser" }));
    await user.click(pinned("Browser"));
    expect(within(frame("window-3")).getByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "true");
    expectNoCanonicalActions();
  });

  it("keeps shared Notes, filesystem, Explorer folder and selection after their windows close", async () => {
    const user = userEvent.setup();
    const { frame, pinned, taskbar, expectNoCanonicalActions } = setup();
    await user.click(pinned("Notes"));
    await user.type(within(frame("window-2")).getByLabelText("Scratch notes"), "check enrollment");
    await user.click(within(frame("window-2")).getByRole("button", { name: "Close Notes" }));
    await user.click(pinned("Notes"));
    expect(within(frame("window-3")).getByLabelText("Scratch notes")).toHaveValue("check enrollment");

    await user.click(pinned("Files"));
    const files = within(frame("window-4"));
    await user.click(files.getByRole("button", { name: /shift-brief\.txt/ }));
    await user.click(files.getByRole("button", { name: "Cut" }));
    await user.click(files.getByRole("button", { name: "Minimize Files" }));
    await user.click(taskbar("Files, minimized"));
    const restoredFiles = within(frame("window-4"));
    expect(restoredFiles.getByRole("button", { name: "Paste here" })).toBeEnabled();
    await user.click(restoredFiles.getByRole("button", { name: /^Downloads/ }));
    await user.click(restoredFiles.getByRole("button", { name: "Paste here" }));
    await user.click(restoredFiles.getByRole("button", { name: /shift-brief\.txt/ }));
    expect(restoredFiles.getByRole("button", { name: /shift-brief\.txt/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(restoredFiles.getByRole("button", { name: "Close Files" }));
    await user.click(pinned("Files"));
    const reopened = within(frame("window-5"));
    expect(reopened.getByRole("button", { name: "Paste here" })).toBeDisabled();
    expect(reopened.getByRole("list", { name: "Files in Downloads" })).toHaveTextContent("shift-brief.txt");
    expect(reopened.getByRole("button", { name: /shift-brief\.txt/ })).toHaveAttribute("aria-pressed", "true");
    expectNoCanonicalActions();
  });
});
