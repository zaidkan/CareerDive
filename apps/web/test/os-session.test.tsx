// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReducer, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import {
  createInitialOsSession,
  reduceOsSession,
  useOsSessionState,
  type OsSessionState,
} from "../src/world/deskOs/osSession.js";
import { initialFakeFs, moveFile } from "../src/world/deskOs/os/useFakeFs.js";
import {
  initialBrowserHistory,
  reduceBrowserHistory,
} from "../src/world/deskOs/os/browserState.js";

afterEach(cleanup);

function makeView(overrides: Partial<ClientView> = {}): ClientView {
  return {
    sessionId: "session-1",
    sessionKind: "assessed",
    simClock: 42,
    currentLocation: {
      id: "operations-center",
      name: "Security Operations Center",
      connectedLocationIds: [],
      interactableIds: [],
    },
    events: [],
    availableActions: [],
    operationalMessages: [],
    pacingMode: "standard",
    artifacts: [],
    ticketNotes: {},
    notebook: "",
    kbQuery: "",
    tasks: [],
    notifications: [],
    queryResults: [],
    workplace: {
      energy: { current: 80, max: 100 },
      carriedSnackBites: 0,
      fridgeSnackBars: 2,
      fridgeOpen: false,
      coffeeServings: 2,
      coffeeStage: "idle",
      julesTopicsSeen: [],
      emergencyRecoveryUsed: false,
    },
    ...overrides,
  };
}

type DeskOsOwnerProps = {
  phase?: "desk_login" | "seated_monitor" | "focus_desk";
  view?: ClientView;
  onAction?: (action: never, freeText?: string) => void;
};

/** Isolated DeskOs with an explicit session owner above the DeskOs mount. */
function OwnerDeskOs({
  phase = "seated_monitor",
  view = makeView(),
  onAction,
}: DeskOsOwnerProps) {
  const [session, onSessionAction] = useOsSessionState();
  return (
    <DeskOs
      phase={phase}
      view={view}
      onAction={(onAction ?? (() => undefined)) as never}
      onLoginSuccess={() => undefined}
      onStand={() => undefined}
      onOsFullscreen={() => undefined}
      session={session}
      onSessionAction={onSessionAction}
    />
  );
}

/**
 * Session owner lives above a mountable DeskOs — mirrors SpatialShell →
 * LaptopOverlay → DeskOs ownership (A1).
 */
function RemountHarness({
  onAction,
  view = makeView(),
}: {
  onAction: (action: unknown) => void;
  view?: ClientView;
}) {
  const [session, onSessionAction] = useOsSessionState();
  const [seated, setSeated] = useState(true);
  return (
    <div>
      <button onClick={() => setSeated(false)} type="button">
        Stand
      </button>
      <button onClick={() => setSeated(true)} type="button">
        Sit
      </button>
      {seated ? (
        <DeskOs
          phase="seated_monitor"
          view={view}
          onAction={onAction as never}
          onLoginSuccess={() => undefined}
          onStand={() => undefined}
          onOsFullscreen={() => undefined}
          session={session}
          onSessionAction={onSessionAction}
        />
      ) : null}
    </div>
  );
}

describe("os session pure state", () => {
  it("fresh session defaults match the previous DeskOs shell defaults", () => {
    const session = createInitialOsSession();
    expect(session.activeApp).toBe("browser");
    expect(session.openFile).toBeNull();
    expect(session.scratchNotes).toBe("");
    expect(session.browserHistory).toEqual(initialBrowserHistory("ops"));
    expect(session.fakeFs).toEqual(initialFakeFs());
  });

  it("two fresh sessions are independent (no shared mutable defaults)", () => {
    const a = createInitialOsSession();
    const b = createInitialOsSession();
    const moved = moveFile(a.fakeFs, "welcome.txt", "documents");
    const nextA = reduceOsSession(a, { type: "set_fake_fs", fs: moved });
    expect(nextA.fakeFs).not.toBe(a.fakeFs);
    expect(b.fakeFs).toEqual(initialFakeFs());
    expect(b.activeApp).toBe("browser");
  });

  it("reducer transitions are pure and cover shell-level actions", () => {
    const start = createInitialOsSession();
    const app = reduceOsSession(start, {
      type: "set_active_app",
      app: "files",
    });
    expect(app.activeApp).toBe("files");
    expect(start.activeApp).toBe("browser");

    const file = { id: "welcome.txt", name: "welcome.txt", body: "hi" };
    const opened = reduceOsSession(app, {
      type: "open_file_in_notes",
      file,
    });
    expect(opened.activeApp).toBe("notes");
    expect(opened.openFile).toEqual(file);

    const cleared = reduceOsSession(opened, {
      type: "set_open_file",
      file: null,
    });
    expect(cleared.openFile).toBeNull();

    const browsed = reduceOsSession(start, {
      type: "browser",
      action: { type: "navigate", page: "intranet" },
    });
    expect(browsed.browserHistory.entries).toEqual(["ops", "intranet"]);
    expect(browsed.browserHistory.index).toBe(1);

    const noted = reduceOsSession(start, {
      type: "set_scratch_notes",
      text: "remember the handoff",
    });
    expect(noted.scratchNotes).toBe("remember the handoff");

    const fsNext = reduceOsSession(start, {
      type: "move_fake_file",
      fileId: "welcome.txt",
      toFolder: "documents",
    });
    expect(
      fsNext.fakeFs.filesByFolder.documents.some(
        (entry) => entry.id === "welcome.txt",
      ),
    ).toBe(true);
    expect(
      fsNext.fakeFs.filesByFolder.desktop.some(
        (entry) => entry.id === "welcome.txt",
      ),
    ).toBe(false);
  });

  it("browser history pure reducer matches previous navigation semantics", () => {
    const start = initialBrowserHistory("ops");
    const intranet = reduceBrowserHistory(start, {
      type: "navigate",
      page: "intranet",
    });
    expect(intranet).toEqual({ entries: ["ops", "intranet"], index: 1 });
    const same = reduceBrowserHistory(intranet, {
      type: "navigate",
      page: "intranet",
    });
    expect(same).toBe(intranet);
    const back = reduceBrowserHistory(intranet, { type: "back" });
    expect(back.index).toBe(0);
    const forward = reduceBrowserHistory(back, { type: "forward" });
    expect(forward.index).toBe(1);
    // Navigate to the page already showing at back: history pointer unchanged.
    const sameAsCurrent = reduceBrowserHistory(back, {
      type: "navigate",
      page: "ops",
    });
    expect(sameAsCurrent).toBe(back);
    // Navigate forward from back truncates any forward entries past the base.
    const reentered = reduceBrowserHistory(back, {
      type: "navigate",
      page: "intranet",
    });
    expect(reentered.entries).toEqual(["ops", "intranet"]);
    expect(reentered.index).toBe(1);
  });

  it("useReducer(createInitialOsSession) starts a fresh OS session", () => {
    function Probe() {
      const [session] = useReducer(
        reduceOsSession,
        undefined,
        createInitialOsSession,
      );
      return <span data-testid="probe">{session.activeApp}</span>;
    }
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("browser");
  });
});

describe("OS session survives DeskOs unmount/remount", () => {
  it("keeps active app, open file, fake FS, browser history, and scratch notes", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<RemountHarness onAction={onAction} />);

    // Active app → files via taskbar.
    await user.click(screen.getByRole("button", { name: "Files" }));

    // Move welcome.txt Desktop → Documents (fake FS state).
    const explorer = screen.getByRole("region", { name: "File Explorer" });
    await user.click(
      within(explorer).getByRole("button", { name: /^Desktop/ }),
    );
    await user.click(
      within(explorer).getByRole("button", { name: /welcome\.txt/ }),
    );
    await user.click(within(explorer).getByRole("button", { name: "Cut" }));
    await user.click(
      within(explorer).getByRole("button", { name: /^Documents/ }),
    );
    await user.click(
      within(explorer).getByRole("button", { name: "Paste here" }),
    );

    // Open moved file into Notes + add scratch text.
    await user.click(
      within(explorer).getByRole("button", { name: /welcome\.txt/ }),
    );
    await user.click(within(explorer).getByRole("button", { name: "Open" }));
    const notes = screen.getByRole("region", { name: "Notes" });
    expect(
      within(notes).getByRole("article", {
        name: "Opened file welcome.txt",
      }),
    ).toBeVisible();
    await user.type(
      within(notes).getByLabelText("Scratch notes"),
      "leave and return notes",
    );

    // Browser history: navigate to intranet, then leave to files.
    await user.click(screen.getByRole("button", { name: "Browser" }));
    await user.click(screen.getByRole("button", { name: "Company intranet" }));
    expect(
      screen.getByRole("article", { name: "Company intranet" }),
    ).toBeVisible();

    // Leave desk → DeskOs unmounts (LaptopOverlay path).
    await user.click(screen.getByRole("button", { name: "Stand" }));
    expect(screen.queryByTestId("desk-os")).toBeNull();

    // Re-sit → DeskOs remounts with the same session owner.
    await user.click(screen.getByRole("button", { name: "Sit" }));

    // Browser history survives: still on intranet, back enabled.
    expect(
      screen.getByRole("article", { name: "Company intranet" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Go back" })).toBeEnabled();

    // FS move survived: welcome.txt is in Documents, not Desktop.
    await user.click(screen.getByRole("button", { name: "Files" }));
    const explorerAfter = screen.getByRole("region", {
      name: "File Explorer",
    });
    await user.click(
      within(explorerAfter).getByRole("button", { name: /^Documents/ }),
    );
    expect(
      within(explorerAfter).getByRole("button", { name: /welcome\.txt/ }),
    ).toBeVisible();
    await user.click(
      within(explorerAfter).getByRole("button", { name: /^Desktop/ }),
    );
    expect(
      within(explorerAfter).queryByRole("button", { name: /welcome\.txt/ }),
    ).toBeNull();

    // Open file + scratch survive remount.
    await user.click(screen.getByRole("button", { name: "Notes" }));
    const notesAfter = screen.getByRole("region", { name: "Notes" });
    expect(
      within(notesAfter).getByRole("article", {
        name: "Opened file welcome.txt",
      }),
    ).toBeVisible();
    expect(within(notesAfter).getByLabelText("Scratch notes")).toHaveValue(
      "leave and return notes",
    );

    // OS-local changes emitted no canonical action.
    expect(onAction).not.toHaveBeenCalled();
  });

  it("keeps active app across remount when only the shell was opened", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<RemountHarness onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Desktop" }));
    expect(screen.getByRole("button", { name: "Open Files" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Stand" }));
    await user.click(screen.getByRole("button", { name: "Sit" }));

    expect(screen.getByRole("button", { name: "Open Files" })).toBeVisible();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("a NEW OS session starts fresh", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    const first = render(<RemountHarness onAction={onAction} />);
    await user.click(screen.getByRole("button", { name: "Notes" }));
    await user.type(
      within(screen.getByRole("region", { name: "Notes" })).getByLabelText(
        "Scratch notes",
      ),
      "session one scratch",
    );
    first.unmount();

    // Fresh owner tree = fresh OS session (not a module singleton).
    render(<RemountHarness onAction={onAction} />);
    expect(screen.getByLabelText("Address bar")).toHaveValue("verdaly://ops");
    await user.click(screen.getByRole("button", { name: "Notes" }));
    const notesFresh = screen.getByRole("region", { name: "Notes" });
    expect(within(notesFresh).queryByRole("article")).toBeNull();
    expect(within(notesFresh).getByLabelText("Scratch notes")).toHaveValue("");
    expect(onAction).not.toHaveBeenCalled();
  });

  it("OS-local session mutations never call onAction", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const view = makeView();
    const before = JSON.stringify(view);
    render(<RemountHarness onAction={onAction} view={view} />);

    await user.click(screen.getByRole("button", { name: "Files" }));
    const explorer = screen.getByRole("region", { name: "File Explorer" });
    await user.click(
      within(explorer).getByRole("button", { name: /shift-brief\.txt/ }),
    );
    await user.click(within(explorer).getByRole("button", { name: "Open" }));
    await user.type(
      within(screen.getByRole("region", { name: "Notes" })).getByLabelText(
        "Scratch notes",
      ),
      "local only",
    );
    await user.click(screen.getByRole("button", { name: "Browser" }));
    await user.click(screen.getByRole("button", { name: "Company intranet" }));
    await user.click(screen.getByRole("button", { name: "Desktop" }));

    expect(onAction).not.toHaveBeenCalled();
    expect(JSON.stringify(view)).toBe(before);
  });

  it("owner-level session state can be seeded and DeskOs reads it on mount", () => {
    const seeded: OsSessionState = {
      ...createInitialOsSession(),
      activeApp: "notes",
      openFile: { id: "seed.txt", name: "seed.txt", body: "seed body" },
      scratchNotes: "seeded scratch",
    };
    function Seeded() {
      const [, onSessionAction] = useReducer(
        reduceOsSession,
        seeded,
      );
      return (
        <DeskOs
          phase="seated_monitor"
          view={makeView()}
          onAction={() => undefined}
          onLoginSuccess={() => undefined}
          onStand={() => undefined}
          onOsFullscreen={() => undefined}
          session={seeded}
          onSessionAction={onSessionAction}
        />
      );
    }
    render(<Seeded />);
    const notes = screen.getByRole("region", { name: "Notes" });
    expect(
      within(notes).getByRole("article", { name: "Opened file seed.txt" }),
    ).toBeVisible();
    expect(within(notes).getByLabelText("Scratch notes")).toHaveValue(
      "seeded scratch",
    );
    expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("isolated OwnerDeskOs still works without SpatialShell", () => {
  it("renders shell defaults", () => {
    render(<OwnerDeskOs />);
    expect(screen.getByLabelText("Address bar")).toHaveValue("verdaly://ops");
  });
});
