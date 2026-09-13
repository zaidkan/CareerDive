// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createInitialWorldState, toClientView } from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { EmailTool } from "../src/components/tools/EmailTool.js";
import { CaseRail } from "../src/components/CaseRail.js";
import { CalendarPanel } from "../src/world/deskOs/DashboardHome.js";

afterEach(cleanup);
const pack = loadDefaultCybersecurityPack();
const view = () =>
  toClientView(createInitialWorldState("content", 24, {}, pack));

it("shows the approved email timestamp without opening its body", () => {
  const current = view();
  const artifact = current.artifacts.find(({ id }) => id === "handoff-email");
  if (!artifact) throw new Error("Missing handoff");
  render(
    <EmailTool
      artifacts={[artifact]}
      onSelect={vi.fn()}
      onOpenArtifact={vi.fn()}
    />,
  );
  expect(screen.getAllByText("07:55")).toHaveLength(2);
  expect(screen.queryByText(/This shift/)).toBeNull();
  expect(artifact).not.toHaveProperty("body");
  expect(
    screen.queryByText(/Did not finish device inventory check/),
  ).toBeNull();
});

it("derives calendar checkpoints from current visible work, not static future meetings", () => {
  const current = view();
  const { rerender } = render(
    <CalendarPanel view={current} onOpenEmail={vi.fn()} />,
  );
  expect(screen.getByText("Shift handoff")).toBeVisible();
  expect(screen.getByText(/Buddy check with Morgan/)).toBeVisible();
  expect(screen.getByText(/Optional break with Jules/)).toBeVisible();
  expect(screen.queryByText(/Priya|09:15|11:00|14:30|locked/)).toBeNull();
  rerender(
    <CalendarPanel
      view={{
        ...current,
        events: current.events.map((event) => ({
          ...event,
          status: "resolved",
        })),
        availableActions: [],
      }}
      onOpenEmail={vi.fn()}
    />,
  );
  expect(screen.queryByText("Shift handoff")).toBeNull();
  expect(screen.queryByText(/Buddy check|Optional break/)).toBeNull();
  expect(screen.getByText(/No current work checkpoints/)).toBeVisible();
});

it.each(["resolved", "escalated"] as const)(
  "keeps the canonical %s resolution visible in the shared case rail",
  (status) => {
    const current = view();
    const resolution =
      "Review requested; the identity of the session owner remains unverified.";
    current.events = current.events.map((event) => ({
      ...event,
      status,
      resolution,
    }));
    render(<CaseRail view={current} onResume={vi.fn()} />);
    expect(screen.getAllByText(resolution)).toHaveLength(current.events.length);
  },
);
