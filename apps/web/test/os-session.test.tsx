// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";

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
  mounted,
  onAction,
}: {
  mounted: boolean;
  onAction: ReturnType<typeof vi.fn>;
}) {
  return (
    <OsSessionProvider>
      {mounted ? <DeskOs {...deskProps(onAction)} /> : <p>Desk unmounted</p>}
    </OsSessionProvider>
  );
}

describe("OS session ownership", () => {
  it("initializes an empty session to current defaults", async () => {
    const user = userEvent.setup();
    render(<SessionHarness mounted onAction={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Browser" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Address bar")).toHaveValue("verdaly://ops");
    expect(screen.getByLabelText("Scratch notes")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Files" }));
    expect(
      within(screen.getByRole("region", { name: "File Explorer" })).getByText(
        "shift-brief.txt",
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Desktop" }));
    expect(screen.getByRole("button", { name: "Desktop" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("restores active app, open file, fake FS, browser history, and notes across DeskOs unmount/remount", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const view = render(<SessionHarness mounted onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Files" }));
    const explorer = screen.getByRole("region", { name: "File Explorer" });
    await user.click(within(explorer).getByRole("button", { name: /shift-brief\.txt/ }));
    await user.click(within(explorer).getByRole("button", { name: "Cut" }));
    await user.click(within(explorer).getByRole("button", { name: /^Downloads/ }));
    await user.click(within(explorer).getByRole("button", { name: "Paste here" }));
    await user.click(within(explorer).getByRole("button", { name: /^Documents/ }));
    await user.click(within(explorer).getByRole("button", { name: /field-notes-draft\.txt/ }));
    await user.click(within(explorer).getByRole("button", { name: "Open" }));

    const notes = screen.getByRole("region", { name: "Notes" });
    expect(
      within(notes).getByRole("article", {
        name: "Opened file field-notes-draft.txt",
      }),
    ).toBeVisible();
    await user.type(screen.getByLabelText("Scratch notes"), "verify enrollment");

    await user.click(screen.getByRole("button", { name: "Browser" }));
    await user.click(screen.getByRole("button", { name: "Company intranet" }));
    expect(screen.getByRole("article", { name: "Company intranet" })).toBeVisible();

    view.rerender(<SessionHarness mounted={false} onAction={onAction} />);
    expect(screen.getByText("Desk unmounted")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Notes" })).toBeNull();

    view.rerender(<SessionHarness mounted onAction={onAction} />);

    expect(screen.getByRole("button", { name: "Browser" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Address bar")).toHaveValue("verdaly://intranet");
    expect(screen.getByRole("button", { name: "Go back" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Notes" }));
    expect(
      within(screen.getByRole("region", { name: "Notes" })).getByRole("article", {
        name: "Opened file field-notes-draft.txt",
      }),
    ).toBeVisible();
    expect(screen.getByLabelText("Scratch notes")).toHaveValue(
      "verify enrollment",
    );

    await user.click(screen.getByRole("button", { name: "Files" }));
    const explorerAgain = screen.getByRole("region", { name: "File Explorer" });
    await user.click(within(explorerAgain).getByRole("button", { name: /^Downloads/ }));
    expect(
      within(screen.getByRole("list", { name: "Files in Downloads" })).getByText(
        "shift-brief.txt",
      ),
    ).toBeVisible();
    await user.click(within(explorerAgain).getByRole("button", { name: /^Documents/ }));
    expect(
      within(screen.getByRole("list", { name: "Files in Documents" })).queryByText(
        "shift-brief.txt",
      ),
    ).toBeNull();

    expect(onAction).not.toHaveBeenCalled();
  });

  it("starts a fresh session with fresh defaults", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const first = render(<SessionHarness mounted onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Desktop" }));
    await user.click(screen.getByRole("button", { name: "Notes" }));
    await user.type(screen.getByLabelText("Scratch notes"), "session one");

    first.unmount();
    render(<SessionHarness mounted onAction={onAction} />);

    expect(screen.getByRole("button", { name: "Browser" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Address bar")).toHaveValue("verdaly://ops");
    expect(screen.getByLabelText("Scratch notes")).toHaveValue("");
    expect(onAction).not.toHaveBeenCalled();
  });
});
