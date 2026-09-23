// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { ExperienceShell } from "../src/experience/ExperienceShell.js";

vi.mock("../src/world/SpatialShell.js", () => ({
  SpatialShell: () => {
    throw new Error("WebGL is unavailable");
  },
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
    energy: { current: 0, max: 100 },
    carriedSnackBites: 1,
    fridgeSnackBars: 2,
    fridgeOpen: false,
    coffeeServings: 2,
    coffeeStage: "idle",
    julesTopicsSeen: [],
    emergencyRecoveryUsed: false,
  },
};

describe("ExperienceShell", () => {
  it("selects each peer renderer without submitting a canonical action", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    const onAction = vi.fn();
    const onWorkplaceInteraction = vi.fn();

    const { rerender } = render(
      <ExperienceShell
        mode="desk"
        onAction={onAction}
        onModeChange={onModeChange}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={view}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Your workstation" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Simple list" }));
    expect(onModeChange).toHaveBeenCalledWith("list");
    expect(onAction).not.toHaveBeenCalled();
    expect(onWorkplaceInteraction).not.toHaveBeenCalled();

    rerender(
      <ExperienceShell
        mode="list"
        onAction={onAction}
        onModeChange={onModeChange}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={view}
      />,
    );
    expect(
      await screen.findByRole("heading", { name: "Structured workplace view" }),
    ).toBeVisible();
  });

  it("reuses finite recovery and Jules interactions in desk-only mode", async () => {
    const user = userEvent.setup();
    const onWorkplaceInteraction = vi.fn().mockResolvedValue({
      view,
      sequence: 1,
      feedback: "energy_recovered",
    });

    render(
      <ExperienceShell
        mode="desk"
        onAction={() => undefined}
        onModeChange={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={view}
      />,
    );

    expect(await screen.findByTestId("energy-meter")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    await user.click(
      screen.getByRole("button", { name: "Eat snack — 1 bite remaining" }),
    );
    await user.click(screen.getByRole("button", { name: "Open fridge" }));
    await user.click(screen.getByRole("button", { name: "Start coffee" }));
    expect(
      screen.queryByRole("button", { name: "Use emergency recovery" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Talk to Jules" }));
    await user.click(screen.getByRole("button", { name: "First day rhythm" }));

    expect(onWorkplaceInteraction).toHaveBeenCalledWith({
      type: "eat_snack_bite",
    });
    expect(onWorkplaceInteraction).toHaveBeenCalledWith({
      type: "open_fridge",
    });
    expect(onWorkplaceInteraction).toHaveBeenCalledWith({
      type: "start_coffee",
    });
    expect(onWorkplaceInteraction).toHaveBeenCalledWith({
      type: "talk_to_jules",
      topic: "first_day",
    });
  });

  it("offers emergency recovery only after the finite resources are exhausted", async () => {
    const user = userEvent.setup();
    const onWorkplaceInteraction = vi.fn().mockResolvedValue({
      view,
      sequence: 1,
      feedback: "energy_recovered",
    });
    const exhaustedView: ClientView = {
      ...view,
      workplace: {
        ...view.workplace,
        carriedSnackBites: 0,
        fridgeSnackBars: 0,
        coffeeServings: 0,
      },
    };

    render(
      <ExperienceShell
        mode="list"
        onAction={() => undefined}
        onModeChange={() => undefined}
        onWorkplaceInteraction={onWorkplaceInteraction}
        view={exhaustedView}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Use emergency recovery" }),
    );
    expect(onWorkplaceInteraction).toHaveBeenCalledWith({
      type: "emergency_recovery",
    });
  });

  it("falls back to desk-only mode when the spatial renderer fails", async () => {
    const onModeChange = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      // React reports the expected boundary error in development.
    });

    try {
      render(
        <ExperienceShell
          mode="walk"
          onAction={() => undefined}
          onModeChange={onModeChange}
          view={view}
        />,
      );

      await waitFor(() => {
        expect(onModeChange).toHaveBeenCalledWith("desk");
      });
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /office view is unavailable/i,
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
