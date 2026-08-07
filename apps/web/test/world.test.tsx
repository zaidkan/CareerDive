// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INITIAL_SPATIAL,
  reduceSpatialEvent,
} from "../src/world/presentation.js";
import { FloorMap } from "../src/world/FloorMap.js";
import { SpatialShell } from "../src/world/SpatialShell.js";
import type { ClientView } from "@sim/schemas";

vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: ({
    onInteract,
  }: {
    onInteract: (id: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onInteract("desk_player")}>
        Sit at desk
      </button>
      <button type="button" onClick={() => onInteract("door_exit")}>
        Exit room
      </button>
    </div>
  ),
}));

afterEach(cleanup);

const view: ClientView = {
  sessionId: "session-1",
  sessionKind: "assessed",
  simClock: 10,
  currentLocation: {
    id: "operations-center",
    name: "Security Operations Center",
    connectedLocationIds: [],
    interactableIds: ["alert-dashboard"],
  },
  events: [
    {
      id: "suspicious-login-1",
      templateId: "suspicious_login",
      title: "Unfamiliar successful login",
      summary: "Repeated failures followed by a successful sign-in.",
      priority: "high",
      systemId: "alert_dashboard",
      status: "active",
      deadlineAt: 180,
      completedActionIds: [],
      observedArtifactIds: ["suspicious-login-alert"],
    },
  ],
  availableActions: [
    {
      id: "inspect_login_context",
      eventId: "suspicious-login-1",
      systemId: "alert_dashboard",
      label: "Inspect login context",
      description: "Review device, location, and account context.",
      simulatedMinutes: 15,
    },
  ],
  operationalMessages: [],
  pacingMode: "standard",
  artifacts: [
    {
      id: "suspicious-login-alert",
      systemId: "alert_dashboard",
      kind: "alert",
      title: "Unfamiliar successful login",
      summary: "Alert A-1042",
      body: "Repeated failures followed by a successful sign-in.",
      eventIds: ["suspicious-login-1"],
      relatedArtifactIds: [],
      searchableText: "login alert",
      metadata: { alertId: "A-1042" },
      observed: true,
    },
  ],
  ticketNotes: {},
  notebook: "",
  kbQuery: "",
};

describe("spatial presentation", () => {
  it("enters SOC room from the floor map", () => {
    const next = reduceSpatialEvent(INITIAL_SPATIAL, {
      type: "enter_room",
      roomId: "soc",
    });
    expect(next.phase).toBe("room_walk");
    expect(next.roomId).toBe("soc");
  });

  it("sits at the desk then focuses the computer", () => {
    let state = reduceSpatialEvent(INITIAL_SPATIAL, {
      type: "enter_room",
      roomId: "soc",
    });
    state = reduceSpatialEvent(state, { type: "sit_desk" });
    expect(state.phase).toBe("seated_monitor");
    state = reduceSpatialEvent(state, { type: "focus_desk" });
    expect(state.phase).toBe("focus_desk");
  });

  it("stands and can return to the floor map", () => {
    let state = reduceSpatialEvent(INITIAL_SPATIAL, {
      type: "enter_room",
      roomId: "soc",
    });
    state = reduceSpatialEvent(state, { type: "sit_desk" });
    state = reduceSpatialEvent(state, { type: "stand" });
    expect(state.phase).toBe("room_walk");
    state = reduceSpatialEvent(state, { type: "leave_room" });
    expect(state.phase).toBe("floor_map");
    expect(state.roomId).toBeUndefined();
  });

  it("lets the player enter the unlocked SOC room", async () => {
    const user = userEvent.setup();
    let entered: string | undefined;
    render(
      <FloorMap
        onEnterRoom={(roomId) => {
          entered = roomId;
        }}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /Security Operations/i }),
    );
    await vi.waitFor(
      () => {
        expect(entered).toBe("soc");
      },
      { timeout: 5000 },
    );
    expect(screen.getByRole("button", { name: /Break room/i })).toBeDisabled();
  });

  it("moves from map to focus desk through the spatial shell", async () => {
    const user = userEvent.setup();
    render(<SpatialShell view={view} onAction={() => undefined} />);

    await user.click(
      screen.getByRole("button", { name: /Security Operations/i }),
    );
    await screen.findByRole("button", { name: /Sit at desk/i }, { timeout: 5000 });
    await user.click(screen.getByRole("button", { name: /Sit at desk/i }));
    await user.click(screen.getByRole("button", { name: /Focus desk/i }));

    expect(
      await screen.findByRole("heading", { name: /Your workstation/i }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Leave desk/i }));
    expect(
      await screen.findByRole("button", { name: /Sit at desk/i }),
    ).toBeVisible();
  });
});
