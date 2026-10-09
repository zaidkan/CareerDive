// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
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
    const view = fresh();
    view.availableActions = [
      {
        id: "submit_shift_handoff",
        eventId: "shift-handoff-1",
        systemId: "team_chat",
        label: "Send end-of-shift handoff",
        description: "Carry work forward",
        simulatedMinutes: 5,
      },
    ];
    const step = getJourneyStep({ view, phase, visitedDesk: true });
    expect(step.title).toMatch(/Send end-of-shift handoff/);
    expect(step.body).toMatch(/select what still matters/);
    expect(step.body).toMatch(/take a break/);
    expect(step.index).not.toBe(1);
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
