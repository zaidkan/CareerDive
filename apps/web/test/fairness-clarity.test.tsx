// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OpsConsole } from "../src/world/deskOs/OpsConsole.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  createInitialWorldState,
  handoffCaseLines,
  toClientView,
} from "@sim/core";
import { HandoffBuilder } from "../src/components/tools/HandoffBuilder.js";
import { CaseRail } from "../src/components/CaseRail.js";
import { SystemApp } from "../src/world/deskOs/SystemApp.js";
import { SystemToolPanel } from "../src/components/SystemToolPanel.js";

function fixture() {
  const view = toClientView(
    createInitialWorldState("fairness", 7, {}, loadDefaultCybersecurityPack()),
  );
  const original = view.events.find(({ id }) => id === "suspicious-login-1");
  if (!original) throw new Error("Missing original fixture");
  view.events = [
    {
      ...original,
      status: "resolved",
      resolution:
        "Escalated for senior review; session ownership remains unverified.",
    },
    {
      ...original,
      id: "routine-alert-1",
      title: "Scanner",
      status: "resolved",
      summary: "the match is not yet checked",
      resolution: "Matched run and window; closed as expected.",
    },
    {
      ...original,
      id: "access-request-1",
      title: "Finance",
      status: "resolved",
      resolution: "Owner approval remains pending. No access was granted.",
    },
  ];
  view.availableActions = [];
  return view;
}
afterEach(cleanup);
it("uses the sent handoff's dispositions for every preview case and outcome history", () => {
  const view = fixture();
  const action = toClientView(
    createInitialWorldState("action", 7, {}, loadDefaultCybersecurityPack()),
  ).availableActions[0];
  if (!action) throw new Error("Missing action fixture");
  render(
    <>
      <HandoffBuilder
        view={view}
        action={action}
        onAction={vi.fn()}
        pending={false}
      />
      <CaseRail view={view} onResume={vi.fn()} />
    </>,
  );
  const preview = screen.getByRole("region", { name: "Handoff preview" });
  for (const line of handoffCaseLines(view.events, view.structuredTickets))
    expect(preview).toHaveTextContent(`${line.title}: ${line.label}`);
  expect(preview).toHaveTextContent("senior review pending");
  expect(preview).toHaveTextContent("routed — approval pending");
  expect(preview).toHaveTextContent("closed as expected");
  expect(screen.getByText("Recorded outcomes (3)")).toBeVisible();
});
it("shows selected-case work while the queue objective concerns a different case", async () => {
  const user = userEvent.setup();
  const view = fixture();
  const original = toClientView(
    createInitialWorldState("action", 7, {}, loadDefaultCybersecurityPack()),
  ).availableActions[0];
  if (!original) throw new Error("Missing original action fixture");
  const scanner = view.events[1];
  if (!scanner) throw new Error("Missing scanner fixture");
  scanner.status = "active";
  delete scanner.resolution;
  view.availableActions = [
    {
      ...original,
      id: "route_access_request",
      label: "Route request to the data owner",
      description: "Approval pending",
      eventId: "access-request-1",
      systemId: "email",
    },
    {
      ...original,
      id: "search_knowledge_base",
      label: "Check scanner window",
      description: "Compare scanner event time with approved window.",
      eventId: scanner.id,
      systemId: "knowledge_base",
    },
  ];
  render(
    <OsSessionProvider>
      <OpsConsole view={view} onAction={vi.fn()} />
    </OsSessionProvider>,
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Current case" }),
    scanner.id,
  );
  const next = screen.getByRole("region", { name: "Current objective" });
  expect(next).toHaveTextContent("Check the relevant guide");
  expect(next).not.toHaveTextContent("Route request");
  expect(
    within(next).getByRole("button", { name: "Go to Guides" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Other work waiting: Finance" }),
  ).toBeVisible();
});
it("does not repeat pre-resolution scanner summary or show its old deadline", () => {
  const view = fixture();
  render(
    <SystemApp
      view={view}
      systemId="team_chat"
      focusEventId="routine-alert-1"
      guidance={null}
      onAction={vi.fn()}
    />,
  );
  expect(screen.queryByText("the match is not yet checked")).toBeNull();
  expect(
    screen.getByText("Matched run and window; closed as expected."),
  ).toBeVisible();
  expect(screen.queryByText(/^Due in/)).toBeNull();
});
it.each(["knowledge_base", "team_chat"] as const)(
  "does not claim no actions alongside %s forms",
  (systemId) => {
    render(
      <SystemToolPanel
        view={fixture()}
        systemId={systemId}
        actions={[]}
        onAction={vi.fn()}
      />,
    );
    expect(screen.queryByText("No pending actions in this tool.")).toBeNull();
  },
);
