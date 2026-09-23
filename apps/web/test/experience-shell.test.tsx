// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { ExperienceShell } from "../src/experience/ExperienceShell.js";

const spatial = { failWebGL: true };

vi.mock("../src/world/SpatialShell.js", () => ({
  SpatialShell: () => {
    if (spatial.failWebGL) throw new Error("WebGL is unavailable");
    return <div data-testid="spatial-shell" />;
  },
}));

afterEach(cleanup);
beforeEach(() => {
  spatial.failWebGL = true;
});

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

const peerLabels = ["Walk the office", "Desk only", "Simple list"] as const;

function expectNoPeerSelector() {
  for (const label of peerLabels) {
    expect(screen.queryByRole("button", { name: label })).toBeNull();
  }
}

async function suppressReactBoundaryErrors<T>(run: () => Promise<T>) {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
    // React reports the expected boundary error when WebGL is forced to fail.
  });
  try {
    return await run();
  } finally {
    consoleError.mockRestore();
  }
}

describe("ExperienceShell single product entry", () => {
  it("does not render a peer mode selector in the normal product path", () => {
    render(
      <ExperienceShell
        onAction={() => undefined}
        onWorkplaceInteraction={vi.fn()}
        view={view}
      />,
    );
    expect(
      screen.queryByRole("navigation", {
        name: /choose how to experience|experience mode/i,
      }),
    ).toBeNull();
    expectNoPeerSelector();
  });

  it("enters SpatialShell directly when WebGL is available", async () => {
    spatial.failWebGL = false;
    render(
      <ExperienceShell
        onAction={() => undefined}
        onWorkplaceInteraction={vi.fn()}
        view={view}
      />,
    );
    expect(await screen.findByTestId("spatial-shell")).toBeVisible();
    expectNoPeerSelector();
    expect(
      screen.queryByRole("heading", { name: "Your workstation" }),
    ).toBeNull();
  });

  it("keeps a keyboard accessibility escape to the compatibility view", async () => {
    spatial.failWebGL = false;
    const user = userEvent.setup();
    render(
      <ExperienceShell
        onAction={() => undefined}
        onWorkplaceInteraction={vi.fn()}
        view={view}
      />,
    );
    expect(await screen.findByTestId("spatial-shell")).toBeVisible();

    const summary = screen.getByText(/having trouble with the 3d view/i);
    summary.focus();
    await user.keyboard("{Enter}");
    const escape = screen.getByRole("button", {
      name: "Open compatibility view",
    });
    escape.focus();
    await user.keyboard("{Enter}");

    expect(
      await screen.findByRole("heading", { name: "Your workstation" }),
    ).toBeVisible();
    expect(screen.queryByTestId("spatial-shell")).toBeNull();
    expectNoPeerSelector();
  });

  it("falls back to a usable compatibility presentation when WebGL fails", async () => {
    await suppressReactBoundaryErrors(async () => {
      render(
        <ExperienceShell
          onAction={() => undefined}
          onWorkplaceInteraction={vi.fn()}
          view={view}
        />,
      );

      expect(
        await screen.findByRole("heading", { name: "Your workstation" }),
      ).toBeVisible();
      expect(screen.getByTestId("energy-meter")).toHaveAttribute(
        "aria-valuenow",
        "0",
      );
      expect(
        screen.getAllByRole("alert").some((node) =>
          /3d office view is unavailable|compatibility view/i.test(
            node.textContent ?? "",
          ),
        ),
      ).toBe(true);
      expectNoPeerSelector();
    });
  });

  it("keeps finite recovery and Jules interactions usable in compatibility", async () => {
    await suppressReactBoundaryErrors(async () => {
      const user = userEvent.setup();
      const onWorkplaceInteraction = vi.fn().mockResolvedValue({
        view,
        sequence: 1,
        feedback: "energy_recovered",
      });

      render(
        <ExperienceShell
          onAction={() => undefined}
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
      await user.click(
        screen.getByRole("button", { name: "First day rhythm" }),
      );

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
      expectNoPeerSelector();
    });
  });

  it("offers emergency recovery only after finite resources are exhausted", async () => {
    await suppressReactBoundaryErrors(async () => {
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
          onAction={() => undefined}
          onWorkplaceInteraction={onWorkplaceInteraction}
          view={exhaustedView}
        />,
      );

      await user.click(
        await screen.findByRole("button", {
          name: "Use emergency recovery",
        }),
      );
      expect(onWorkplaceInteraction).toHaveBeenCalledWith({
        type: "emergency_recovery",
      });
    });
  });

  it("does not fire canonical actions merely by entering compatibility", async () => {
    await suppressReactBoundaryErrors(async () => {
      const onAction = vi.fn();
      render(<ExperienceShell onAction={onAction} view={view} />);
      expect(
        await screen.findByRole("heading", { name: "Your workstation" }),
      ).toBeVisible();
      expect(onAction).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(onAction).not.toHaveBeenCalled();
      });
    });
  });
});
