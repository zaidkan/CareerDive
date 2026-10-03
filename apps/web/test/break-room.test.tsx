// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
          onNearbyChange("fridge", "Fridge");
        }}
        type="button"
      >
        Approach fridge
      </button>
      <button
        onClick={() => {
          onNearbyChange("coffee", "Coffee maker");
        }}
        type="button"
      >
        Approach coffee maker
      </button>
      <button
        onClick={() => {
          onInteract("desk_player");
        }}
        type="button"
      >
        Sit at desk
      </button>
      <button
        onClick={() => {
          onBreakRoomExit?.();
        }}
        type="button"
      >
        Cross break-room threshold
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
    </div>
  ),
}));

import { SpatialShell } from "../src/world/SpatialShell.js";

const baseView: ClientView = {
  sessionId: "break-room-session",
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
  tasks: [],
  notifications: [],
  queryResults: [],
  workplace: {
    energy: { current: 37, max: 100 },
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

function interactionResult(
  view: ClientView,
  feedback: WorkplaceInteractionResult["feedback"] = "fridge_opened",
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
  await screen.findByRole("button", { name: "Approach fridge" });
}

describe("finite break-room interaction loop", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders canonical energy without starting a wall-clock drain", async () => {
    const user = userEvent.setup();
    render(<SpatialShell onAction={() => undefined} view={baseView} />);

    await enterSoc(user);

    expect(screen.getByTestId("energy-meter")).toHaveAttribute(
      "aria-valuenow",
      "37",
    );
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("opens, takes from, and manually closes the canonical fridge", async () => {
    const user = userEvent.setup();
    const onWorkplaceInteraction = vi
      .fn()
      .mockResolvedValue(interactionResult(baseView));
    const { rerender } = render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={baseView}
      />,
    );
    await enterSoc(user);
    await user.click(screen.getByRole("button", { name: "Approach fridge" }));

    await user.click(screen.getByRole("button", { name: "Open fridge" }));
    expect(onWorkplaceInteraction).toHaveBeenLastCalledWith({
      type: "open_fridge",
    });

    const opened = viewWith({ fridgeOpen: true });
    rerender(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={opened}
      />,
    );
    expect(screen.getByText("2 snack bars inside")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Take one snack bar" }),
    );
    expect(onWorkplaceInteraction).toHaveBeenLastCalledWith({
      type: "take_snack",
    });

    rerender(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={viewWith({
          carriedSnackBites: 3,
          fridgeOpen: true,
          fridgeSnackBars: 1,
        })}
      />,
    );
    expect(screen.getByText("Your hands are full.")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Take one snack bar" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close fridge" }));
    expect(onWorkplaceInteraction).toHaveBeenLastCalledWith({
      type: "close_fridge",
    });
  });

  it("shows empty-fridge copy without exposing hidden stock", async () => {
    const user = userEvent.setup();
    render(
      <SpatialShell
        onAction={() => undefined}
        view={viewWith({ fridgeOpen: true, fridgeSnackBars: 0 })}
      />,
    );
    await enterSoc(user);
    await user.click(screen.getByRole("button", { name: "Approach fridge" }));

    expect(screen.getByText("The fridge is empty.")).toBeVisible();
    expect(screen.queryByText(/snack bars inside/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close fridge" })).toBeVisible();
  });

  it("keeps exact carried-bite controls available at the office desk", async () => {
    const user = userEvent.setup();
    const onWorkplaceInteraction = vi
      .fn()
      .mockResolvedValue(interactionResult(baseView, "snack_bite_eaten"));
    const { rerender } = render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={viewWith({ carriedSnackBites: 3 })}
      />,
    );
    await enterSoc(user);
    await user.click(screen.getByRole("button", { name: "Sit at desk" }));

    await user.click(screen.getByText(/Desk resources · energy/));

    for (const bites of [3, 2, 1] as const) {
      expect(
        screen.getByRole("button", {
          name: `Eat snack — ${String(bites)} ${bites === 1 ? "bite" : "bites"} remaining`,
        }),
      ).toBeVisible();
      await user.click(
        screen.getByRole("button", {
          name: `Eat snack — ${String(bites)} ${bites === 1 ? "bite" : "bites"} remaining`,
        }),
      );
      expect(onWorkplaceInteraction).toHaveBeenLastCalledWith({
        type: "eat_snack_bite",
      });
      if (bites > 1) {
        rerender(
          <SpatialShell
            onAction={() => undefined}
            onWorkplaceInteraction={onWorkplaceInteraction}
            view={viewWith({ carriedSnackBites: bites - 1 })}
          />,
        );
      }
    }
  });

  it("exposes deterministic coffee transitions without real-time advancement", async () => {
    const user = userEvent.setup();
    const onWorkplaceInteraction = vi
      .fn()
      .mockResolvedValue(interactionResult(baseView, "coffee_started"));
    const { rerender } = render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={baseView}
      />,
    );
    await enterSoc(user);
    await user.click(
      screen.getByRole("button", { name: "Approach coffee maker" }),
    );

    const stages = [
      ["idle", "Start coffee", "start_coffee"],
      ["brewing", "Finish brewing", "finish_coffee"],
      ["ready", "Pour coffee", "pour_coffee"],
      ["poured", "Drink coffee", "drink_coffee"],
    ] as const;

    for (const [stage, label, interaction] of stages) {
      rerender(
        <SpatialShell
          onAction={() => undefined}
          onWorkplaceInteraction={onWorkplaceInteraction}
          view={viewWith({ coffeeStage: stage })}
        />,
      );
      expect(screen.getByRole("button", { name: label })).toBeVisible();
      if (stage === "brewing") {
        await new Promise((resolve) => window.setTimeout(resolve, 20));
        expect(screen.getByRole("button", { name: label })).toBeVisible();
        expect(onWorkplaceInteraction).not.toHaveBeenCalledWith({
          type: "finish_coffee",
        });
      }
      await user.click(screen.getByRole("button", { name: label }));
      expect(onWorkplaceInteraction).toHaveBeenLastCalledWith({
        type: interaction,
      });
    }
  });

  it("explains why a poured coffee cannot be drunk at full energy", async () => {
    const user = userEvent.setup();
    render(
      <SpatialShell
        onAction={() => undefined}
        view={viewWith({
          coffeeStage: "poured",
          energy: { current: 100, max: 100 },
        })}
      />,
    );
    await enterSoc(user);
    await user.click(
      screen.getByRole("button", { name: "Approach coffee maker" }),
    );

    expect(screen.getByText("Energy is already full.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Drink coffee" })).toBeDisabled();
  });

  it("shows recovery direction at zero without erasing the workplace", async () => {
    const user = userEvent.setup();
    render(
      <SpatialShell
        onAction={() => undefined}
        view={viewWith({ energy: { current: 0, max: 100 } })}
      />,
    );
    await enterSoc(user);

    expect(screen.getByText(/Energy is empty/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Approach fridge" }),
    ).toBeVisible();
    expect(screen.queryByText(/fell asleep/i)).not.toBeInTheDocument();
  });

  it("submits one close when leaving while the first close is pending", async () => {
    const user = userEvent.setup();
    let resolveClose:
      | ((result: WorkplaceInteractionResult) => void)
      | undefined;
    const pendingClose = new Promise<WorkplaceInteractionResult>((resolve) => {
      resolveClose = resolve;
    });
    const onWorkplaceInteraction = vi.fn(() => pendingClose);
    render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={viewWith({ fridgeOpen: true })}
      />,
    );
    await enterSoc(user);

    const threshold = screen.getByRole("button", {
      name: "Cross break-room threshold",
    });
    const hotspot = screen.getByRole("button", {
      name: "Coffee resource hotspot",
    });
    await user.click(threshold);
    await user.click(threshold);
    await user.click(hotspot);
    hotspot.focus();
    await user.keyboard("e");
    expect(onWorkplaceInteraction).toHaveBeenCalledTimes(1);
    expect(onWorkplaceInteraction).toHaveBeenCalledWith({
      type: "close_fridge",
    });

    resolveClose?.(
      interactionResult(viewWith({ fridgeOpen: false }), "fridge_closed"),
    );
  });

  it("queues one close from the canonical open result when exit races the open", async () => {
    const user = userEvent.setup();
    const opened = deferred<WorkplaceInteractionResult>();
    const closed = deferred<WorkplaceInteractionResult>();
    const onWorkplaceInteraction = vi
      .fn()
      .mockImplementationOnce(() => opened.promise)
      .mockImplementationOnce(() => closed.promise);
    render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={baseView}
      />,
    );
    await enterSoc(user);
    await user.click(screen.getByRole("button", { name: "Approach fridge" }));
    await user.click(screen.getByRole("button", { name: "Open fridge" }));

    const threshold = screen.getByRole("button", {
      name: "Cross break-room threshold",
    });
    const hotspot = screen.getByRole("button", {
      name: "Coffee resource hotspot",
    });
    await user.click(threshold);
    await user.click(threshold);
    await user.click(hotspot);
    hotspot.focus();
    await user.keyboard("e");
    expect(onWorkplaceInteraction).toHaveBeenCalledTimes(1);

    await act(async () => {
      opened.resolve(
        interactionResult(viewWith({ fridgeOpen: true }), "fridge_opened"),
      );
      await opened.promise;
    });

    await waitFor(() => {
      expect(onWorkplaceInteraction).toHaveBeenCalledTimes(2);
    });
    expect(onWorkplaceInteraction).toHaveBeenNthCalledWith(1, {
      type: "open_fridge",
    });
    expect(onWorkplaceInteraction).toHaveBeenNthCalledWith(2, {
      type: "close_fridge",
    });
    await user.click(hotspot);
    hotspot.focus();
    await user.keyboard("e");
    expect(onWorkplaceInteraction).toHaveBeenCalledTimes(2);

    await act(async () => {
      closed.resolve(
        interactionResult(viewWith({ fridgeOpen: false }), "fridge_closed"),
      );
      await closed.promise;
    });
    expect(onWorkplaceInteraction).toHaveBeenCalledTimes(2);
  });

  it("blocks hotspot pointer and keyboard resource calls during a pending close", async () => {
    const user = userEvent.setup();
    const closed = deferred<WorkplaceInteractionResult>();
    const onWorkplaceInteraction = vi.fn(() => closed.promise);
    render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={viewWith({ fridgeOpen: true })}
      />,
    );
    await enterSoc(user);
    await user.click(screen.getByRole("button", { name: "Approach fridge" }));
    await user.click(screen.getByRole("button", { name: "Close fridge" }));

    const hotspot = screen.getByRole("button", {
      name: "Coffee resource hotspot",
    });
    await user.click(hotspot);
    hotspot.focus();
    await user.keyboard("e");
    await user.click(
      screen.getByRole("button", { name: "Approach coffee maker" }),
    );
    expect(screen.getByRole("button", { name: "Start coffee" })).toBeDisabled();
    expect(onWorkplaceInteraction).toHaveBeenCalledTimes(1);
    expect(onWorkplaceInteraction).toHaveBeenCalledWith({
      type: "close_fridge",
    });

    await act(async () => {
      closed.resolve(
        interactionResult(viewWith({ fridgeOpen: false }), "fridge_closed"),
      );
      await closed.promise;
    });
  });

  it("clears a failed queued exit without retrying in a loop", async () => {
    const user = userEvent.setup();
    const opened = deferred<WorkplaceInteractionResult>();
    const closed = deferred<WorkplaceInteractionResult>();
    const onWorkplaceInteraction = vi
      .fn()
      .mockImplementationOnce(() => opened.promise)
      .mockImplementationOnce(() => closed.promise);
    render(
      <SpatialShell
        onAction={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={baseView}
      />,
    );
    await enterSoc(user);
    await user.click(screen.getByRole("button", { name: "Approach fridge" }));
    await user.click(screen.getByRole("button", { name: "Open fridge" }));
    await user.click(
      screen.getByRole("button", { name: "Cross break-room threshold" }),
    );

    await act(async () => {
      opened.resolve(
        interactionResult(viewWith({ fridgeOpen: true }), "fridge_opened"),
      );
      await opened.promise;
    });
    await waitFor(() => {
      expect(onWorkplaceInteraction).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      closed.reject(new Error("network unavailable"));
      await expect(closed.promise).rejects.toThrow("network unavailable");
    });

    expect(
      await screen.findByText(/fridge did not close.*break room.*try again/i),
    ).toBeVisible();
    expect(onWorkplaceInteraction).toHaveBeenCalledTimes(2);
  });
});
