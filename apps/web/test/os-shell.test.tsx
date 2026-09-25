// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";

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

function renderShell() {
  const onAction = vi.fn();
  render(
    <OsSessionProvider>
      <DeskOs
        phase="seated_monitor"
        view={makeView()}
        onAction={onAction}
        onLoginSuccess={() => undefined}
        onStand={() => undefined}
        onOsFullscreen={() => undefined}
      />
    </OsSessionProvider>,
  );
  return { onAction };
}

describe("fake-OS desktop shell", () => {
  it("opens on the browser with the ops console bookmarked, then swaps apps via the taskbar", async () => {
    const user = userEvent.setup();
    renderShell();

    // Browser is the default app with the ops console loaded.
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();
    expect(screen.getByRole("button", { name: "SOC Ops Console" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Address bar")).toHaveValue("verdaly://ops");

    // Closing the only window exposes the desktop workspace.
    await user.click(screen.getByRole("button", { name: "Close Browser" }));
    expect(screen.queryByRole("tab", { name: "Dashboard" })).toBeNull();
    expect(screen.getByRole("button", { name: "Open Browser" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open Files" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open Notes" })).toBeVisible();

    // Desktop icon reopens the browser on the ops console.
    await user.click(screen.getByRole("button", { name: "Open Browser" }));
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Your workstation" })).toBeVisible();

    // Bookmark bar navigates away and back without losing the console.
    await user.click(screen.getByRole("button", { name: "Company intranet" }));
    expect(screen.queryByRole("tab", { name: "Dashboard" })).toBeNull();
    expect(screen.getByRole("article", { name: "Company intranet" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Go back" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "SOC Ops Console" }));
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Company intranet" }));
    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();

    // Taskbar clock shows sim time only.
    expect(screen.getByText("Shift 08:42")).toBeVisible();
  });

  it("moves a file between folders via keyboard cut/paste with no canonical effect", async () => {
    const user = userEvent.setup();
    const { onAction } = renderShell();

    await user.click(screen.getByRole("button", { name: "Files" }));
    const explorer = screen.getByRole("region", { name: "File Explorer" });
    expect(within(explorer).getByText("shift-brief.txt")).toBeVisible();

    await user.click(within(explorer).getByRole("button", { name: /shift-brief\.txt/ }));
    await user.click(within(explorer).getByRole("button", { name: "Cut" }));
    await user.click(within(explorer).getByRole("button", { name: /^Downloads/ }));
    await user.click(within(explorer).getByRole("button", { name: "Paste here" }));

    expect(
      within(screen.getByRole("list", { name: "Files in Downloads" })).getByText("shift-brief.txt"),
    ).toBeVisible();
    await user.click(within(explorer).getByRole("button", { name: /^Documents/ }));
    expect(
      within(screen.getByRole("list", { name: "Files in Documents" })).queryByText("shift-brief.txt"),
    ).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Moved shift-brief.txt from Documents to Downloads.",
    );
    expect(onAction).not.toHaveBeenCalled();
  });

  it("moves a file via drag-and-drop with no canonical effect", async () => {
    const { onAction } = renderShell();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Files" }));
    const explorer = screen.getByRole("region", { name: "File Explorer" });
    await user.click(within(explorer).getByRole("button", { name: /^Downloads/ }));

    const file = within(explorer).getByRole("button", { name: /vpn-setup\.txt/ });
    fireEvent.dragStart(file, {
      dataTransfer: { setData: () => undefined, getData: () => "vpn-setup.txt", effectAllowed: "move" },
    });
    const desktop = within(explorer).getByRole("button", { name: /^Desktop/ });
    fireEvent.drop(desktop, {
      dataTransfer: { getData: () => "vpn-setup.txt" },
    });

    await user.click(within(explorer).getByRole("button", { name: /^Desktop/ }));
    expect(
      within(screen.getByRole("list", { name: "Files in Desktop" })).getByText("vpn-setup.txt"),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Moved vpn-setup.txt from Downloads to Desktop.",
    );
    expect(onAction).not.toHaveBeenCalled();
  });
});
