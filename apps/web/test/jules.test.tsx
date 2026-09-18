// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import type { WorkplaceInteractionResult } from "../src/client.js";

vi.mock("../src/world/FloorMap.js", () => ({
  FloorMap: ({ onEnterRoom }: { onEnterRoom: (roomId: "soc") => void }) => (
    <button
      onClick={() => {
        onEnterRoom("soc");
      }}
      type="button"
    >
      Security Operations
    </button>
  ),
}));

vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: ({
    onBreakRoomExit,
    onInteract,
    onNearbyChange,
  }: {
    onBreakRoomExit?: () => void;
    onInteract: (id: string) => void;
    onNearbyChange: (id?: string, label?: string) => void;
  }) => (
    <div>
      <button
        onClick={() => {
          onNearbyChange("jules", "Jules");
        }}
        type="button"
      >
        Approach Jules
      </button>
      <button
        onKeyDown={(event) => {
          if (event.code === "KeyE") onInteract("jules");
        }}
        type="button"
      >
        Jules keyboard hotspot
      </button>
      <button
        onClick={() => {
          onNearbyChange("fridge", "Fridge");
        }}
        type="button"
      >
        Approach fridge
      </button>
      <button
        onClick={() => {
          onInteract("coffee");
        }}
        onKeyDown={(event) => {
          if (event.code === "KeyE") onInteract("coffee");
        }}
        type="button"
      >
        Coffee resource hotspot
      </button>
      <button onClick={onBreakRoomExit} type="button">
        Cross break-room threshold
      </button>
    </div>
  ),
}));

import { SpatialShell } from "../src/world/SpatialShell.js";

const baseView: ClientView = {
  sessionId: "jules-web-session",
  sessionKind: "assessed",
  simClock: 20,
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
      completedActionIds: ["review_alert", "inspect_login_context"],
      observedArtifactIds: ["suspicious-login-alert", "login-context-1"],
    },
  ],
  availableActions: [
    {
      id: "check_device_inventory",
      eventId: "suspicious-login-1",
      systemId: "knowledge_base",
      label: "Check device inventory",
      description: "Confirm whether the device is enrolled.",
      simulatedMinutes: 10,
    },
  ],
  operationalMessages: [],
  pacingMode: "standard",
  artifacts: [],
  ticketNotes: {},
  notebook: "",
  kbQuery: "",
  tasks: [],
  notifications: [],
  workplace: {
    energy: { current: 64, max: 100 },
    carriedSnackBites: 0,
    fridgeSnackBars: 2,
    fridgeOpen: false,
    coffeeServings: 2,
    coffeeStage: "idle",
    julesTopicsSeen: [],
    emergencyRecoveryUsed: false,
  },
};

function viewWith(workplace: Partial<ClientView["workplace"]>): ClientView {
  return {
    ...baseView,
    workplace: {
      ...baseView.workplace,
      ...workplace,
      energy: workplace.energy ?? baseView.workplace.energy,
    },
  };
}

function result(
  view: ClientView,
  feedback: WorkplaceInteractionResult["feedback"] = "jules_replied",
): WorkplaceInteractionResult {
  return { view, feedback, sequence: 1 };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function enterSoc(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: /Security Operations/i }),
  );
  await screen.findByRole("button", { name: "Approach Jules" });
}

async function openJulesVisually(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Approach Jules" }));
  await user.click(screen.getByRole("button", { name: "Talk to Jules" }));
  return screen.findByRole("dialog", { name: "Conversation with Jules" });
}

afterEach(cleanup);

describe("purposeful Jules dialogue panel", () => {
  it("opens the same accessible topics visually and by keyboard with canonical IDs", async () => {
    const user = userEvent.setup();
    const onWorkplaceInteraction = vi
      .fn()
      .mockResolvedValue(result(viewWith({ julesTopicsSeen: ["first_day"] })));
    const { rerender } = render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={baseView}
      />,
    );
    await enterSoc(user);

    let dialog = await openJulesVisually(user);
    expect(
      within(dialog).getByRole("heading", { name: "Jules" }),
    ).toBeVisible();
    expect(within(dialog).getAllByRole("button")).toHaveLength(4);
    expect(
      within(dialog).getByRole("button", { name: "First day rhythm" }),
    ).toBeVisible();
    expect(
      screen.queryByText(/best five minutes|day one's better/i),
    ).toBeNull();

    await user.click(
      within(dialog).getByRole("button", { name: "First day rhythm" }),
    );
    expect(onWorkplaceInteraction).toHaveBeenLastCalledWith({
      type: "talk_to_jules",
      topic: "first_day",
    });
    expect(
      await within(dialog).findByText(/monitoring.*notes.*interruptions/i),
    ).toBeVisible();

    rerender(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={viewWith({ julesTopicsSeen: ["first_day"] })}
      />,
    );
    dialog = screen.getByRole("dialog", { name: "Conversation with Jules" });
    expect(
      within(dialog).getByText("First day rhythm · Discussed"),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "Team context" }),
    ).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Close" }));

    const keyboardHotspot = screen.getByRole("button", {
      name: "Jules keyboard hotspot",
    });
    keyboardHotspot.focus();
    await user.keyboard("e");
    dialog = await screen.findByRole("dialog", {
      name: "Conversation with Jules",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Current work" }),
    );
    expect(onWorkplaceInteraction).toHaveBeenLastCalledWith({
      type: "talk_to_jules",
      topic: "current_work",
    });
  });

  it("shows a stage reply and destination only after canonical success", async () => {
    const user = userEvent.setup();
    const pending = deferred<WorkplaceInteractionResult>();
    const onWorkplaceInteraction = vi.fn(() => pending.promise);
    render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={baseView}
      />,
    );
    await enterSoc(user);
    const dialog = await openJulesVisually(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Current work" }),
    );
    expect(onWorkplaceInteraction).toHaveBeenCalledWith({
      type: "talk_to_jules",
      topic: "current_work",
    });
    expect(within(dialog).queryByText(/device inventory/i)).toBeNull();
    expect(
      within(dialog).getByRole("button", { name: "Current work" }),
    ).toBeDisabled();

    await act(async () => {
      pending.resolve(result(viewWith({ julesTopicsSeen: ["current_work"] })));
      await pending.promise;
    });

    expect(await within(dialog).findByText(/device inventory/i)).toBeVisible();
    expect(within(dialog).getByText(/Back to Guides/i)).toBeVisible();
  });

  it("allows Close during a pending reply and retains only the successful reply", async () => {
    const user = userEvent.setup();
    const talking = deferred<WorkplaceInteractionResult>();
    const onWorkplaceInteraction = vi.fn(() => talking.promise);
    render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={baseView}
      />,
    );
    await enterSoc(user);
    const dialog = await openJulesVisually(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Current work" }),
    );

    const close = within(dialog).getByRole("button", { name: "Close" });
    expect(close).toBeEnabled();
    await user.click(close);
    expect(
      screen.queryByRole("dialog", { name: "Conversation with Jules" }),
    ).toBeNull();
    expect(onWorkplaceInteraction).toHaveBeenCalledTimes(1);

    await act(async () => {
      talking.resolve(result(viewWith({ julesTopicsSeen: ["current_work"] })));
      await talking.promise;
    });

    const reopened = await openJulesVisually(user);
    expect(within(reopened).getByText(/device inventory/i)).toBeVisible();
  });

  it("allows Escape during a pending reply while the shared gate stays closed", async () => {
    const user = userEvent.setup();
    const talking = deferred<WorkplaceInteractionResult>();
    const onWorkplaceInteraction = vi.fn(() => talking.promise);
    render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={baseView}
      />,
    );
    await enterSoc(user);
    const dialog = await openJulesVisually(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Current work" }),
    );

    within(dialog).getByRole("button", { name: "Close" }).focus();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Conversation with Jules" }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Approach fridge" }));
    expect(screen.getByRole("button", { name: "Open fridge" })).toBeDisabled();
    const coffee = screen.getByRole("button", {
      name: "Coffee resource hotspot",
    });
    await user.click(coffee);
    coffee.focus();
    await user.keyboard("e");
    expect(onWorkplaceInteraction).toHaveBeenCalledTimes(1);

    await act(async () => {
      talking.resolve(result(viewWith({ julesTopicsSeen: ["current_work"] })));
      await talking.promise;
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open fridge" })).toBeEnabled();
    });
  });

  it("keeps the panel open without revealing a reply after failure", async () => {
    const user = userEvent.setup();
    const onWorkplaceInteraction = vi
      .fn()
      .mockRejectedValue(new Error("network unavailable"));
    render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={baseView}
      />,
    );
    await enterSoc(user);
    const dialog = await openJulesVisually(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Current work" }),
    );

    await waitFor(() => {
      expect(
        within(dialog).getByRole("button", { name: "Current work" }),
      ).toBeEnabled();
    });
    expect(within(dialog).queryByText(/device inventory/i)).toBeNull();
    expect(
      screen.getByText(/break-room action did not go through/i),
    ).toBeVisible();
  });

  it("shares one pending gate with resources and preserves the queued fridge close", async () => {
    const user = userEvent.setup();
    const talking = deferred<WorkplaceInteractionResult>();
    const onWorkplaceInteraction = vi
      .fn()
      .mockImplementationOnce(() => talking.promise)
      .mockResolvedValueOnce(
        result(viewWith({ fridgeOpen: false }), "fridge_closed"),
      );
    render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={viewWith({ fridgeOpen: true })}
      />,
    );
    await enterSoc(user);
    const dialog = await openJulesVisually(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Current work" }),
    );

    await user.click(screen.getByRole("button", { name: "Approach fridge" }));
    expect(screen.getByRole("button", { name: "Close fridge" })).toBeDisabled();
    const coffee = screen.getByRole("button", {
      name: "Coffee resource hotspot",
    });
    await user.click(coffee);
    coffee.focus();
    await user.keyboard("e");
    await user.click(
      screen.getByRole("button", { name: "Cross break-room threshold" }),
    );
    expect(onWorkplaceInteraction).toHaveBeenCalledTimes(1);

    await act(async () => {
      talking.resolve(
        result(
          viewWith({ fridgeOpen: true, julesTopicsSeen: ["current_work"] }),
        ),
      );
      await talking.promise;
    });

    await waitFor(() => {
      expect(onWorkplaceInteraction).toHaveBeenCalledTimes(2);
    });
    expect(onWorkplaceInteraction).toHaveBeenNthCalledWith(1, {
      type: "talk_to_jules",
      topic: "current_work",
    });
    expect(onWorkplaceInteraction).toHaveBeenNthCalledWith(2, {
      type: "close_fridge",
    });
  });

  it("attempts one queued close after a rejected reply and holds the gate until it settles", async () => {
    const user = userEvent.setup();
    const talking = deferred<WorkplaceInteractionResult>();
    const closing = deferred<WorkplaceInteractionResult>();
    const onWorkplaceInteraction = vi
      .fn()
      .mockImplementationOnce(() => talking.promise)
      .mockImplementationOnce(() => closing.promise);
    render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={viewWith({ fridgeOpen: true })}
      />,
    );
    await enterSoc(user);
    const dialog = await openJulesVisually(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Current work" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Cross break-room threshold" }),
    );

    await act(async () => {
      talking.reject(new Error("reply unavailable"));
      await expect(talking.promise).rejects.toThrow("reply unavailable");
    });

    await waitFor(() => {
      expect(onWorkplaceInteraction).toHaveBeenCalledTimes(2);
    });
    expect(onWorkplaceInteraction).toHaveBeenNthCalledWith(2, {
      type: "close_fridge",
    });

    await user.click(screen.getByRole("button", { name: "Approach fridge" }));
    expect(screen.getByRole("button", { name: "Close fridge" })).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Cross break-room threshold" }),
    );
    const coffee = screen.getByRole("button", {
      name: "Coffee resource hotspot",
    });
    await user.click(coffee);
    coffee.focus();
    await user.keyboard("e");
    expect(onWorkplaceInteraction).toHaveBeenCalledTimes(2);

    await act(async () => {
      closing.reject(new Error("close unavailable"));
      await expect(closing.promise).rejects.toThrow("close unavailable");
    });

    expect(
      await screen.findByText(/fridge did not close.*break room.*try again/i),
    ).toBeVisible();
    expect(onWorkplaceInteraction).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Close fridge" }),
      ).toBeEnabled();
    });
  });
});
