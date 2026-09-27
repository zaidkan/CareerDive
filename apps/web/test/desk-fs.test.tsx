// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";
import {
  findFile,
  findFileFolder,
  folderById,
  folderPath,
  initialFakeFs,
  moveFile,
  resolveFolderId,
} from "../src/world/deskOs/os/useFakeFs.js";

afterEach(cleanup);

function makeView(): ClientView {
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
  };
}

function deskProps(onAction: ReturnType<typeof vi.fn>) {
  return {
    phase: "seated_monitor" as const,
    view: makeView(),
    onAction,
    onLoginSuccess: () => undefined,
    onStand: () => undefined,
    onOsFullscreen: () => undefined,
  };
}

function SessionHarness({
  mounted = true,
  onAction,
}: {
  mounted?: boolean;
  onAction: ReturnType<typeof vi.fn>;
}) {
  return (
    <OsSessionProvider>
      {mounted ? <DeskOs {...deskProps(onAction)} /> : <p>Desk unmounted</p>}
    </OsSessionProvider>
  );
}

async function openFiles(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Files" }));
  return screen.getByRole("region", { name: "File Explorer" });
}

describe("virtual filesystem init", () => {
  it("initializes a deterministic five-folder tree with only shift-useful files", () => {
    const a = initialFakeFs();
    const b = initialFakeFs();
    expect(a).toEqual(b);

    expect(a.folders.map((entry) => entry.id)).toEqual([
      "desktop",
      "documents",
      "downloads",
      "cases",
      "shared",
      "documents/templates",
    ]);
    expect(folderById(a, "cases")).toMatchObject({
      id: "cases",
      parentId: null,
      label: "Cases",
    });
    expect(folderById(a, "documents/templates")).toMatchObject({
      parentId: "documents",
    });

    // No filler: every seeded file has a body; Cases starts empty.
    expect(a.filesByFolder.cases).toEqual([]);
    for (const entry of a.folders) {
      for (const file of a.filesByFolder[entry.id] ?? []) {
        expect(file.body.length).toBeGreaterThan(0);
        expect(file.kind).toBeTruthy();
      }
    }

    expect(findFile(a, "shift-brief.txt")?.kind).toBe("text");
    expect(findFile(a, "handoff-checklist.md")?.kind).toBe("markdown");
    expect(findFile(a, "it-onboarding.log")?.kind).toBe("log");
    expect(findFile(a, "escalation-contacts.csv")?.kind).toBe("structured");
    expect(findFileFolder(a, "welcome.txt")).toBe("desktop");
  });

  it("never seeds hidden case answers or canonical evidence into the workstation disk", () => {
    const fs = initialFakeFs();
    const bodies = fs.folders.flatMap(
      (entry) => (fs.filesByFolder[entry.id] ?? []).map((file) => file.body),
    );
    const all = bodies.join("\n").toLowerCase();
    // Pack-level solution markers must not leak into local files.
    expect(all).not.toContain("unknown-laptop-17");
    expect(all).not.toContain("203.0.113.44");
    expect(all).not.toContain("did not finish device inventory check");
    expect(all).not.toContain("montreal");
  });

  it("resolves invalid folder ids to the documents fallback", () => {
    const fs = initialFakeFs();
    expect(resolveFolderId(fs, "does-not-exist")).toBe("documents");
    expect(folderPath(fs, "does-not-exist")).toEqual([]);
    expect(folderPath(fs, "documents/templates").map((entry) => entry.id)).toEqual([
      "documents",
      "documents/templates",
    ]);
    expect(findFile(fs, "missing.txt")).toBeNull();
    expect(moveFile(fs, "missing.txt", "desktop")).toBe(fs);
  });
});

describe("File Explorer navigation", () => {
  it("navigates folders via sidebar, breadcrumbs, subfolders, and Up with no canonical effect", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<SessionHarness onAction={onAction} />);
    const explorer = await openFiles(user);

    expect(
      within(explorer).getByRole("list", { name: "Files in Documents" }),
    ).toBeVisible();
    expect(within(explorer).getByText("shift-brief.txt")).toBeVisible();
    expect(
      within(explorer).getByRole("button", { name: "Go up one folder" }),
    ).toBeDisabled();

    await user.click(within(explorer).getByRole("button", { name: /^Cases/ }));
    expect(
      within(explorer).getByRole("list", { name: "Files in Cases" }),
    ).toBeVisible();
    expect(within(explorer).getByText("Empty folder.")).toBeVisible();
    expect(within(explorer).queryByText("shift-brief.txt")).toBeNull();

    await user.click(within(explorer).getByRole("button", { name: /^Documents/ }));
    await user.click(
      within(explorer).getByRole("button", { name: /templates\// }),
    );
    const path = within(explorer).getByRole("navigation", { name: "Folder path" });
    expect(within(path).getByRole("button", { name: "templates" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(path).getByRole("button", { name: "Documents" })).toBeVisible();
    expect(
      within(explorer).getByRole("list", { name: "Files in templates" }),
    ).toBeVisible();
    expect(within(explorer).getByText("shift-handoff-template.md")).toBeVisible();

    await user.click(within(explorer).getByRole("button", { name: "Go up one folder" }));
    expect(
      within(explorer).getByRole("list", { name: "Files in Documents" }),
    ).toBeVisible();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("opens files in Notes as a type-aware read-only viewer with zero canonical effect", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<SessionHarness onAction={onAction} />);
    const explorer = await openFiles(user);

    await user.click(within(explorer).getByRole("button", { name: /^Downloads/ }));
    const logButton = within(explorer).getByRole("button", {
      name: /it-onboarding\.log/,
    });
    expect(logButton).toHaveAttribute("data-filetype", "log");
    await user.click(logButton);
    await user.click(within(explorer).getByRole("button", { name: "Open" }));

    const notes = screen.getByRole("region", { name: "Notes" });
    const article = within(notes).getByRole("article", {
      name: "Opened file it-onboarding.log",
    });
    expect(article).toHaveAttribute("data-filetype", "log");
    expect(within(article).getByText("Log")).toBeVisible();
    expect(article).toHaveTextContent("profile verdaly-vpn installed");
    // Viewer is read-only: scratch is a separate control.
    expect(screen.getByLabelText("Scratch notes")).toHaveValue("");
    expect(onAction).not.toHaveBeenCalled();
  });

  it("handles a stale explorer selection without opening a missing file", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<SessionHarness onAction={onAction} />);
    const explorer = await openFiles(user);

    // Selection points at a file id that does not exist in the tree.
    await user.click(within(explorer).getByRole("button", { name: /shift-brief\.txt/ }));
    expect(
      within(explorer).getByRole("button", { name: "Open" }),
    ).toBeEnabled();

    // Move the selected file away, then confirm selection clears safely.
    await user.click(within(explorer).getByRole("button", { name: "Cut" }));
    await user.click(within(explorer).getByRole("button", { name: /^Downloads/ }));
    await user.click(within(explorer).getByRole("button", { name: "Paste here" }));
    expect(
      within(explorer).getByRole("button", { name: "Open" }),
    ).toBeDisabled();
    expect(screen.queryByRole("region", { name: "Notes" })).toBeNull();
    expect(onAction).not.toHaveBeenCalled();
  });
});

describe("Notes as scratch (not evidence)", () => {
  it("edits scratch notes without mutating canonical view state", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const view = makeView();
    const before = JSON.stringify(view);
    render(
      <OsSessionProvider>
        <DeskOs
          {...deskProps(onAction)}
          view={view}
        />
      </OsSessionProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Notes" }));
    await user.type(screen.getByLabelText("Scratch notes"), "verify enrollment");

    expect(screen.getByLabelText("Scratch notes")).toHaveValue(
      "verify enrollment",
    );
    expect(onAction).not.toHaveBeenCalled();
    expect(JSON.stringify(view)).toBe(before);
    expect(view.ticketNotes).toEqual({});
    expect(view.notebook).toBe("");
    expect(view.artifacts).toEqual([]);
  });

  it("persists scratch notes and open file across DeskOs unmount/remount", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const rendered = render(<SessionHarness onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Files" }));
    await user.click(
      screen.getByRole("button", { name: /handoff-checklist\.md/ }),
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.type(screen.getByLabelText("Scratch notes"), "carry open items");

    rendered.rerender(<SessionHarness mounted={false} onAction={onAction} />);
    expect(screen.queryByRole("region", { name: "Notes" })).toBeNull();

    rendered.rerender(<SessionHarness onAction={onAction} />);
    await user.click(screen.getByRole("button", { name: "Notes" }));
    expect(screen.getByLabelText("Scratch notes")).toHaveValue("carry open items");
    expect(
      screen.getByRole("article", { name: "Opened file handoff-checklist.md" }),
    ).toBeVisible();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("starts each new session with empty notes and a fresh filesystem", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const first = render(<SessionHarness onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Notes" }));
    await user.type(screen.getByLabelText("Scratch notes"), "session one");
    const explorer = await openFiles(user);
    await user.click(
      within(explorer).getByRole("button", { name: /shift-brief\.txt/ }),
    );
    await user.click(within(explorer).getByRole("button", { name: "Cut" }));
    await user.click(within(explorer).getByRole("button", { name: /^Desktop/ }));
    await user.click(within(explorer).getByRole("button", { name: "Paste here" }));

    first.unmount();
    render(<SessionHarness onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Notes" }));
    expect(screen.getByLabelText("Scratch notes")).toHaveValue("");
    const freshExplorer = await openFiles(user);
    const foldersGroup = within(freshExplorer).getByRole("group", {
      name: "Folders",
    });
    await user.click(
      within(foldersGroup).getByRole("button", { name: /^Documents/ }),
    );
    expect(
      within(freshExplorer).getByText("shift-brief.txt"),
    ).toBeVisible();
    expect(onAction).not.toHaveBeenCalled();
  });
});

describe("File Explorer state continuity", () => {
  it("restores explorer folder and selection across DeskOs unmount/remount", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const rendered = render(<SessionHarness onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Files" }));
    await user.click(screen.getByRole("button", { name: /^Cases/ }));
    await user.click(screen.getByRole("button", { name: /^Documents/ }));
    await user.click(
      screen.getByRole("button", { name: /field-notes-draft\.txt/ }),
    );
    expect(
      screen.getByRole("button", { name: /field-notes-draft\.txt/ }),
    ).toHaveAttribute("aria-pressed", "true");

    rendered.rerender(<SessionHarness mounted={false} onAction={onAction} />);
    rendered.rerender(<SessionHarness onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Files" }));
    const explorer = screen.getByRole("region", { name: "File Explorer" });
    expect(
      within(explorer).getByRole("list", { name: "Files in Documents" }),
    ).toBeVisible();
    expect(
      within(explorer).getByRole("button", {
        name: /field-notes-draft\.txt/,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(onAction).not.toHaveBeenCalled();
  });
});
