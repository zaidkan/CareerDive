// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import {
  applyWorkplaceInteraction,
  createInitialWorldState,
  toClientView,
} from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { WorkplaceInteraction } from "@sim/schemas";
import { ExperienceShell } from "../src/experience/ExperienceShell.js";

vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: ({
    onAcceptedDistance,
    onWalkBlocked,
    onRecover,
  }: {
    onAcceptedDistance: (meters: number) => void;
    onWalkBlocked: () => void;
    onRecover: () => void;
  }) => (
    <div data-interaction-id="movement_exertion">
      <button
        onClick={() => {
          onAcceptedDistance(2.5);
        }}
      >
        Accepted walk
      </button>
      <button onClick={onWalkBlocked}>Blocked walk</button>
      <button onClick={onRecover}>Recovered position</button>
    </div>
  ),
}));
afterEach(cleanup);
const pack = loadDefaultCybersecurityPack();

it("submits the same movement ID through spatial and keyboard-only controls, without evidence", async () => {
  const user = userEvent.setup();
  let state = createInitialWorldState("movement-parity", 24, {}, pack);
  const submit = vi.fn(async (interaction: WorkplaceInteraction) => {
    const turn = applyWorkplaceInteraction(state, interaction);
    expect(turn.effects).toEqual([]);
    state = turn.state;
    return {
      view: toClientView(state),
      sequence: 1,
      feedback: turn.feedbackCode,
    };
  });
  const props = () => ({
    view: toClientView(state),
    onAction: vi.fn(),
    onModeChange: vi.fn(),
    onWorkplaceInteraction: submit,
  });
  const { rerender, container } = render(
    <ExperienceShell {...props()} mode="walk" />,
  );
  await user.click(screen.getByRole("button", { name: /Security Operations/ }));
  await user.click(
    await screen.findByRole(
      "button",
      { name: "Accepted walk" },
      { timeout: 6000 },
    ),
  );
  expect(submit).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Accepted walk" }));
  await waitFor(() => {
    expect(submit).toHaveBeenCalledTimes(1);
  });
  expect(
    container.querySelector('[data-interaction-id="movement_exertion"]'),
  ).not.toBeNull();
  expect(state.workplace.energy.current).toBe(99);
  await user.click(screen.getByRole("button", { name: "Blocked walk" }));
  await user.click(screen.getByRole("button", { name: "Return to aisle" }));
  expect(submit).toHaveBeenCalledTimes(1);
  for (const mode of ["list", "desk"] as const) {
    rerender(<ExperienceShell {...props()} mode={mode} />);
    const button = screen.getByRole("button", { name: "Walk 5 meters" });
    expect(button).toHaveAttribute("data-interaction-id", "movement_exertion");
    button.focus();
    await user.keyboard("{Enter}");
    await waitFor(
      () => {
        expect(state.workplace.energy.current).toBe(mode === "list" ? 98 : 97);
      },
      { timeout: 2500 },
    );
  }
  expect(submit.mock.calls.map(([interaction]) => interaction)).toEqual(
    Array.from({ length: 3 }, () => ({
      type: "movement_exertion",
      distanceMeters: 5,
    })),
  );
}, 15000);

it.each(["walk", "desk", "list"] as const)(
  "exposes canonical emergency recovery without evidence in %s",
  async (mode) => {
    const user = userEvent.setup();
    const state = createInitialWorldState("recovery-parity", 24, {}, pack);
    state.workplace = {
      ...state.workplace,
      energy: { current: 0, max: 100 },
      fridgeSnackBars: 0,
      coffeeServings: 0,
    };
    const submit = vi.fn(async (interaction: WorkplaceInteraction) => {
      const turn = applyWorkplaceInteraction(state, interaction);
      expect(turn.effects).toEqual([]);
      expect(turn.state.workplace.energy.current).toBe(20);
      return {
        view: toClientView(turn.state),
        sequence: 1,
        feedback: turn.feedbackCode,
      };
    });
    render(
      <ExperienceShell
        view={toClientView(state)}
        mode={mode}
        onModeChange={vi.fn()}
        onAction={vi.fn()}
        onWorkplaceInteraction={submit}
      />,
    );
    if (mode === "walk")
      await user.click(
        screen.getByRole("button", { name: /Security Operations/ }),
      );
    const button = await screen.findByRole(
      "button",
      { name: "Use emergency recovery" },
      { timeout: 6000 },
    );
    expect(button).toHaveAttribute("data-interaction-id", "emergency_recovery");
    button.focus();
    await user.keyboard("{Enter}");
    expect(submit).toHaveBeenCalledExactlyOnceWith({
      type: "emergency_recovery",
    });
  },
  10000,
);

it("shows mutation retry while walking", async () => {
  const user = userEvent.setup();
  render(
    <ExperienceShell
      view={toClientView(createInitialWorldState("retry", 24, {}, pack))}
      mode="walk"
      onModeChange={vi.fn()}
      onAction={vi.fn()}
      mutationState={{ error: "Movement save failed" }}
      onRetryMutation={vi.fn()}
    />,
  );
  await user.click(screen.getByRole("button", { name: /Security Operations/ }));
  expect(
    await screen.findByRole("alert", {}, { timeout: 6000 }),
  ).toHaveTextContent("Movement save failed");
  expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
}, 10000);
