// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { RecoveryWorkspace } from "../src/experience/RecoveryWorkspace.js";
import { getJourneyStep } from "../src/journey.js";
import { TeamChatTool } from "../src/components/tools/TeamChatTool.js";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
function fresh() {
  return toClientView(
    createInitialWorldState(
      "recovery-bucket-a",
      7,
      {},
      loadDefaultCybersecurityPack(),
    ),
  );
}
it("recovery reuses five tools and shows finish guidance after the final handoff", () => {
  const view = fresh();
  view.events = view.events
    .filter((e) => e.id === "handoff-1" || e.id === "shift-handoff-1")
    .map((e) => ({
      ...e,
      status: "resolved" as const,
      completedActionIds: ["submit_shift_handoff"],
    }));
  view.availableActions = [
    {
      id: "complete_shift",
      eventId: "shift",
      systemId: "team_chat",
      label: "Complete shift",
      description: "Review the shift",
      simulatedMinutes: 0,
    },
  ];
  render(<RecoveryWorkspace view={view} onAction={() => {}} />);
  expect(
    screen
      .getByRole("navigation", { name: "Workstation tools" })
      .querySelectorAll("button"),
  ).toHaveLength(5);
  expect(
    screen.getByRole("region", { name: "Current objective" }),
  ).toHaveTextContent("Ready to review your shift");
  expect(screen.queryByRole("tablist")).toBeNull();
  expect(screen.queryByText("Queue objective")).toBeNull();
});
it.each(["floor_map", "room_walk"] as const)(
  "returning %s keeps the real objective and allows a break",
  (phase) => {
    // Recovery must follow canonical progress, not an action-only fixture that
    // still has the incoming assignment active.
    const state = createInitialWorldState(
      "returning-handoff",
      7,
      {},
      loadDefaultCybersecurityPack(),
    );
    state.simClock = 90;
    state.events = state.events.map((event) => ({
      ...event,
      status: event.id === "shift-handoff-1" ? "active" : "resolved",
    }));
    const view = toClientView(state);
    expect(view.availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "submit_shift_handoff",
          eventId: "shift-handoff-1",
        }),
      ]),
    );
    const step = getJourneyStep({ view, phase, visitedDesk: true });
    expect(step.title).toBe("Leave the next analyst a handoff");
    expect(step.body).toMatch(/actual case outcomes and open questions/);
    expect(step.body).toMatch(/take a break/);
    expect(step.index).toBe(7);
    expect(step.target).toEqual(
      phase === "floor_map"
        ? { kind: "room", roomId: "soc" }
        : { kind: "hotspot", hotspotId: "desk_player" },
    );
  },
);
it("case chat excludes unrelated case messages", () => {
  const view = fresh();
  view.teamMessages = [
    {
      id: "old",
      eventId: "handoff-1",
      author: "morgan",
      body: "Old handoff instructions",
      actionId: "ask_manager",
      simMinutes: 0,
    },
    {
      id: "current",
      eventId: "access-request-1",
      author: "morgan",
      body: "Current finance context",
      actionId: "ask_manager",
      simMinutes: 5,
    },
  ];
  render(<TeamChatTool view={view} eventId="access-request-1" />);
  expect(screen.queryByText("Old handoff instructions")).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Current finance context",
  );
});

it("offers waiting end-handoff navigation from a recorded case without sending it", async () => {
  const user = userEvent.setup();
  const state = createInitialWorldState(
    "waiting-handoff",
    7,
    {},
    loadDefaultCybersecurityPack(),
  );
  state.simClock = 90;
  state.events = state.events.map((event) => ({
    ...event,
    status: event.id === "shift-handoff-1" ? "active" : "resolved",
  }));
  const onAction = vi.fn();
  render(<RecoveryWorkspace view={toClientView(state)} onAction={onAction} />);
  await user.selectOptions(
    screen.getByLabelText("Current case"),
    "status-check-1",
  );
  expect(
    screen.getByRole("region", { name: "Current objective" }),
  ).toHaveTextContent("What did your message carry");
  await user.click(
    screen.getByRole("button", {
      name: "Other work waiting: End-of-shift continuity",
    }),
  );
  expect(screen.getByLabelText("Current case")).toHaveValue("shift-handoff-1");
  expect(
    screen.getByRole("region", { name: "Current objective" }),
  ).toHaveTextContent("What should the next analyst know and check next?");
  expect(
    screen.getByRole("heading", { name: "End-of-shift continuity" }),
  ).toHaveFocus();
  expect(
    screen.getByRole("button", { name: "Send handoff to next analyst" }),
  ).toBeVisible();
  expect(onAction).not.toHaveBeenCalled();
});
