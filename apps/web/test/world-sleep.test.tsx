// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";

const energyMock = vi.hoisted(() => ({ collapse: false }));

vi.mock("../src/world/energy.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/world/energy.js")>();
  return {
    ...actual,
    drainEnergy: (current: number, seconds: number, seated: boolean) =>
      energyMock.collapse ? 0 : actual.drainEnergy(current, seconds, seated),
  };
});

vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: ({
    enabled,
    onInteract,
  }: {
    enabled: boolean;
    onInteract: (id: string) => void;
  }) => (
    <div data-enabled={String(enabled)} data-testid="room-canvas-double">
      <button
        type="button"
        onClick={() => {
          onInteract("desk_player");
        }}
      >
        Sit at desk
      </button>
    </div>
  ),
}));

import { SpatialShell } from "../src/world/SpatialShell.js";

const view: ClientView = {
  sessionId: "sleep-session",
  sessionKind: "assessed",
  simClock: 10,
  currentLocation: {
    id: "operations-center",
    name: "Security Operations Center",
    connectedLocationIds: [],
    interactableIds: ["alert-dashboard"],
  },
  events: [],
  availableActions: [],
  operationalMessages: [],
  pacingMode: "standard",
  artifacts: [],
  ticketNotes: {},
  notebook: "",
  kbQuery: "",
};

describe("energy collapse", () => {
  let nextFrame: FrameRequestCallback | undefined;

  beforeEach(() => {
    energyMock.collapse = false;
    nextFrame = undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("freezes world and desk input without submitting a simulation action", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<SpatialShell view={view} onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: /Security Operations/i }));
    await user.click(
      await screen.findByRole("button", { name: /Sit at desk/i }, { timeout: 6000 }),
    );
    const username = screen.getByLabelText(/Username/i);
    username.focus();
    expect(username).toHaveFocus();

    energyMock.collapse = true;
    act(() => {
      nextFrame?.(performance.now() + 16);
    });

    expect(await screen.findByText(/You fell asleep/i)).toBeVisible();
    expect(screen.getByTestId("room-canvas-double")).toHaveAttribute(
      "data-enabled",
      "false",
    );
    expect(screen.getByTestId("desk-os-overlay")).toHaveAttribute("inert");
    expect(username).not.toHaveFocus();
    expect(onAction).not.toHaveBeenCalled();
  });
});
