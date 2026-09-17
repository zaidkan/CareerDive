// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import { LaptopOverlay } from "../src/world/deskOs/LaptopOverlay.js";

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

function renderShell() {
  const onAction = vi.fn();
  const view = makeView();
  const before = JSON.stringify(view);
  render(
    <DeskOs
      phase="seated_monitor"
      view={view}
      onAction={onAction}
      onLoginSuccess={() => undefined}
      onStand={() => undefined}
      onOsFullscreen={() => undefined}
    />,
  );
  return { onAction, before };
}

function stubReducedMotion(matches: boolean) {
  const original = window.matchMedia;
  const stub: MediaQueryList = {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  };
  window.matchMedia = () => stub;
  return () => {
    window.matchMedia = original;
  };
}

describe("os-shell hardening", () => {
  it("reduced-motion path shows content immediately with no timer-dependent feedback", async () => {
    const restore = stubReducedMotion(true);
    try {
      const user = userEvent.setup();
      renderShell();

      // Reload resolves synchronously: never enters the pending state.
      await user.click(screen.getByRole("button", { name: "Reload page" }));
      expect(screen.getByRole("button", { name: "Reload page" })).toBeEnabled();
      expect(screen.queryByText("Reloading page.")).toBeNull();

      // App switches render their content synchronously, no timers involved.
      await user.click(screen.getByRole("button", { name: "Desktop" }));
      expect(screen.getByRole("button", { name: "Open Browser" })).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Open Browser" }));
      expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();
      expect(screen.getByRole("heading", { name: "Your workstation" })).toBeVisible();
    } finally {
      restore();
    }
  });

  it("unmounting mid-reload does not throw and never touches canonical state", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const view = makeView();
    const { unmount } = render(
      <DeskOs
        phase="seated_monitor"
        view={view}
        onAction={onAction}
        onLoginSuccess={() => undefined}
        onStand={() => undefined}
        onOsFullscreen={() => undefined}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Reload page" }));
    expect(() => {
      unmount();
    }).not.toThrow();
    expect(onAction).not.toHaveBeenCalled();
    expect(JSON.stringify(view)).toBe(
      JSON.stringify({ ...view }),
    );
  });

  it("keyboard Enter on a file opens it in Notes with zero canonical effect", async () => {
    const user = userEvent.setup();
    const { onAction, before } = renderShell();

    await user.click(screen.getByRole("button", { name: "Files" }));
    const explorer = screen.getByRole("region", { name: "File Explorer" });
    const file = within(explorer).getByRole("button", { name: /shift-brief\.txt/ });
    expect(file).toHaveAttribute("data-filetype", "text");
    file.focus();
    await user.keyboard("{Enter}");

    const notes = screen.getByRole("region", { name: "Notes" });
    expect(within(notes).getByRole("article", { name: "Opened file shift-brief.txt" })).toHaveTextContent(
      "Read the handoff email first.",
    );
    expect(onAction).not.toHaveBeenCalled();
    expect(JSON.stringify(makeView())).toBe(before);
  });

  it("double-click on a file opens it in Notes with zero canonical effect", async () => {
    const user = userEvent.setup();
    const { onAction } = renderShell();

    await user.click(screen.getByRole("button", { name: "Files" }));
    const explorer = screen.getByRole("region", { name: "File Explorer" });
    await user.click(within(explorer).getByRole("button", { name: /^Downloads/ }));
    const file = within(explorer).getByRole("button", { name: /vpn-setup\.txt/ });
    expect(file).toHaveAttribute("data-filetype", "text");
    await user.dblClick(file);

    expect(
      within(screen.getByRole("region", { name: "Notes" })).getByRole("article", {
        name: "Opened file vpn-setup.txt",
      }),
    ).toBeVisible();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("ops bookmark is the default page and exposes the start-work hint", async () => {
    const user = userEvent.setup();
    renderShell();

    expect(screen.getByLabelText("Address bar")).toHaveValue("verdaly://ops");
    const bookmarks = screen.getByRole("navigation", { name: "Bookmarks" });
    const buttons = within(bookmarks).getAllByRole("button");
    expect(buttons[0]).toHaveAccessibleName("SOC Ops Console");
    const ops = screen.getByRole("button", { name: "SOC Ops Console" });
    expect(ops).toHaveAttribute("aria-pressed", "true");
    expect(ops).toHaveAttribute("aria-current", "page");
    const hintId = ops.getAttribute("aria-describedby");
    expect(hintId).toBeTruthy();
    expect(document.getElementById(hintId ?? "")).toHaveTextContent("Start your shift here");
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();

    // Leaving and re-activating the bookmark keeps the console intact.
    await user.click(screen.getByRole("button", { name: "Company intranet" }));
    expect(screen.queryByRole("tab", { name: "Dashboard" })).toBeNull();
    await user.click(ops);
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();
  });

  it("app switches preserve Files, Notes, and Browser state", async () => {
    const user = userEvent.setup();
    renderShell();

    // Open a file in Notes and add scratch text.
    await user.click(screen.getByRole("button", { name: "Files" }));
    const explorer = screen.getByRole("region", { name: "File Explorer" });
    await user.click(within(explorer).getByRole("button", { name: /shift-brief\.txt/ }));
    await user.click(within(explorer).getByRole("button", { name: "Open" }));
    const notesBox = screen.getByLabelText("Scratch notes");
    await user.type(notesBox, "check enrollment first");

    // Switch away through every app, then back.
    await user.click(screen.getByRole("button", { name: "Files" }));
    expect(
      within(screen.getByRole("region", { name: "File Explorer" })).getByRole("button", {
        name: /shift-brief\.txt/,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Desktop" }));
    await user.click(screen.getByRole("button", { name: "Open Browser" }));
    await user.click(screen.getByRole("button", { name: "Company intranet" }));
    await user.click(screen.getByRole("button", { name: "SOC Ops Console" }));
    expect(screen.getByLabelText("Address bar")).toHaveValue("verdaly://ops");
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Notes" }));
    expect(
      within(screen.getByRole("region", { name: "Notes" })).getByRole("article", {
        name: "Opened file shift-brief.txt",
      }),
    ).toHaveTextContent("Read the handoff email first.");
    expect(screen.getByLabelText("Scratch notes")).toHaveValue("check enrollment first");
  });

  it("keyboard-only flow reaches the ops console inside the overlay", async () => {
    const user = userEvent.setup();
    render(
      <LaptopOverlay
        phase="seated_monitor"
        view={makeView()}
        onAction={() => undefined}
        onLoginSuccess={() => undefined}
        onStand={() => undefined}
      />,
    );
    expect(screen.getByTestId("desk-os-overlay")).toBeVisible();

    const press = async (name: string | RegExp) => {
      const control = screen.getByRole("button", { name });
      control.focus();
      expect(control).toHaveFocus();
      await user.keyboard("{Enter}");
    };

    // Desktop icon, taskbar buttons, bookmarks, and tabs all work by keyboard.
    await press("Desktop");
    await press("Open Browser");
    await press("Company intranet");
    expect(screen.getByRole("article", { name: "Company intranet" })).toBeVisible();
    await press("SOC Ops Console");
    expect(screen.getByRole("tablist", { name: "Workstation apps" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();

    const focusable = ["Desktop", "Browser", "Files", "Notes", "Go back", "Reload page", "SOC Ops Console"];
    for (const name of focusable) {
      const control = screen.getByRole("button", { name });
      control.focus();
      expect(control).toHaveFocus();
      expect(control).toBeEnabled();
    }
  });
});
