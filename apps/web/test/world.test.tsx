// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import {
  INITIAL_SPATIAL,
  reduceSpatialEvent,
} from "../src/world/presentation.js";
import { FloorMap } from "../src/world/FloorMap.js";
import { SpatialShell } from "../src/world/SpatialShell.js";

vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: ({ onInteract }: { onInteract: (id: string) => void }) => (
    <div>
      <button
        type="button"
        onClick={() => {
          onInteract("desk_player");
        }}
      >
        Sit at desk
      </button>
      <button
        type="button"
        onClick={() => {
          onInteract("door_exit");
        }}
      >
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
        category: "main_case",
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
  tasks: [],
  notifications: [],
  workplace: {
    energy: { current: 100, max: 100 },
    carriedSnackBites: 0,
    fridgeSnackBars: 2,
    fridgeOpen: false,
    coffeeServings: 2,
    coffeeStage: "idle",
    julesTopicsSeen: [],
    emergencyRecoveryUsed: false,
  },
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

  it("sits at the desk then maximizes the computer", () => {
    let state = reduceSpatialEvent(INITIAL_SPATIAL, {
      type: "enter_room",
      roomId: "soc",
    });
    state = reduceSpatialEvent(state, { type: "sit_desk" });
    expect(state.phase).toBe("desk_login");
    state = reduceSpatialEvent(state, { type: "login_success" });
    expect(state.phase).toBe("seated_monitor");
    state = reduceSpatialEvent(state, { type: "focus_desk" });
    expect(state.phase).toBe("focus_desk");
    state = reduceSpatialEvent(state, { type: "unfocus_desk" });
    expect(state.phase).toBe("seated_monitor");
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
      { timeout: 6000 },
    );
    expect(
      screen.getByRole("button", { name: /Manager Office/i }),
    ).toBeDisabled();
  });

  it("guides the player to the room, then the desk, then the desk work", async () => {
    const user = userEvent.setup();
    render(<SpatialShell view={view} onAction={() => undefined} />);

    const socRoom = screen.getByRole("button", {
      name: /Security Operations/i,
    });
    expect(socRoom).toHaveTextContent(/go here next/i);
    expect(screen.getByText(/Head to Security Operations/i)).toBeVisible();
    expect(screen.getByText(/gold door on the plan/i)).toBeVisible();

    await user.click(socRoom);
    await screen.findByRole(
      "button",
      { name: /Sit at desk/i },
      { timeout: 6000 },
    );
    expect(screen.getByText(/Find your desk/i)).toBeVisible();
    expect(screen.getByText(/follow the gold marker/i)).toBeVisible();
    expect(screen.getByTestId("energy-meter")).toBeVisible();
    expect(screen.getByText(/Click to look around/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /^Fullscreen$/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Sit at desk/i }));
    expect(screen.getByText(/Sign in to your workstation/i)).toBeVisible();
    expect(screen.queryByText(/Click to look around/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("login-post-it")).toHaveTextContent(
      "day1.analyst",
    );
    expect(screen.getByTestId("login-post-it")).toHaveTextContent("FirstDay!");
    expect(
      screen.getAllByRole("button", { name: "Expand workstation" }),
    ).toHaveLength(1);
  });

  it("hides the look hint while the pointer is locked", async () => {
    const user = userEvent.setup();
    render(<SpatialShell view={view} onAction={() => undefined} />);
    await user.click(
      screen.getByRole("button", { name: /Security Operations/i }),
    );
    await screen.findByRole(
      "button",
      { name: /Sit at desk/i },
      { timeout: 6000 },
    );
    expect(screen.getByText(/Click to look around/i)).toBeVisible();

    const previous = Object.getOwnPropertyDescriptor(
      Document.prototype,
      "pointerLockElement",
    );
    Object.defineProperty(Document.prototype, "pointerLockElement", {
      configurable: true,
      enumerable: true,
      get() {
        return document.body;
      },
    });
    expect(document.pointerLockElement).toBe(document.body);
    document.dispatchEvent(new Event("pointerlockchange"));
    await waitFor(() => {
      expect(
        screen.queryByText(/Click to look around/i),
      ).not.toBeInTheDocument();
    });

    if (previous) {
      Object.defineProperty(Document.prototype, "pointerLockElement", previous);
    }
  });

  it("moves from map to in-sim desk OS through the spatial shell", async () => {
    const user = userEvent.setup();
    render(<SpatialShell view={view} onAction={() => undefined} />);

    await user.click(
      screen.getByRole("button", { name: /Security Operations/i }),
    );
    await screen.findByRole(
      "button",
      { name: /Sit at desk/i },
      { timeout: 6000 },
    );
    await user.click(screen.getByRole("button", { name: /Sit at desk/i }));
    expect(
      await screen.findByRole("heading", { name: /Sign in/i }),
    ).toBeVisible();
    await user.type(screen.getByLabelText(/Username/i), "day1.analyst");
    await user.type(screen.getByLabelText(/Password/i), "FirstDay!");
    await user.click(screen.getByRole("button", { name: /^Login$/i }));
    expect(
      await screen.findByRole(
        "heading",
        { name: /Your workstation/i },
        { timeout: 3000 },
      ),
    ).toBeVisible();
    expect(screen.queryByTestId("login-post-it")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Expand workstation" }),
    ).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /Leave desk/i }));
    expect(
      await screen.findByRole("button", { name: /Sit at desk/i }),
    ).toBeVisible();
  });
});
