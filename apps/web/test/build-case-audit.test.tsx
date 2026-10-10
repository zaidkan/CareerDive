// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import {
  applyWorkplaceInteraction,
  createInitialWorldState,
  toClientView,
} from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  getFirstDayStep,
  getOptionalShiftHints,
  getShiftGuidance,
} from "../src/guidance.js";
import { CaseWorkspace } from "../src/world/deskOs/CaseWorkspace.js";
import { CaseCommunication } from "../src/world/deskOs/CaseCommunication.js";
import { OpsConsole } from "../src/world/deskOs/OpsConsole.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";
import { ShiftHints } from "../src/world/dialogue/ShiftHints.js";
import { EMPTY_MUTATION_STATE } from "../src/useMutationCoordinator.js";
const initial = () =>
  createInitialWorldState("audit", 7, {}, loadDefaultCybersecurityPack());
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

it("signposts saved findings instead of removed step buttons, without crediting source openings", () => {
  const state = initial();
  const view = toClientView(state);
  const working = {
    ...view,
    events: view.events.map((e) =>
      e.id === "handoff-1" ? { ...e, status: "resolved" as const } : e,
    ),
  };
  expect(getShiftGuidance(working)?.headline).toBe(
    "What sequence created S-0741?",
  );
  expect(
    getOptionalShiftHints(working, "seated_monitor", "suspicious-login-1").join(
      " ",
    ),
  ).not.toMatch(/Record comparison|Return to Alerts to choose/);
  const opened = {
    ...working,
    artifacts: working.artifacts.map((a) => ({ ...a, observed: true })),
  };
  expect(getShiftGuidance(opened)?.headline).toBe(
    getShiftGuidance(working)?.headline,
  );
  expect(getFirstDayStep(working)).toBeNull();
});

it("switches the finding to the selected tool and preserves the earlier draft", async () => {
  const user = userEvent.setup();
  const props = {
    view: toClientView(initial()),
    eventId: "suspicious-login-1",
    mutationState: EMPTY_MUTATION_STATE,
    onAction: vi.fn(),
    onOpenSystem: vi.fn(),
  };
  const mounted = render(
    <CaseWorkspace {...props} systemId="alert_dashboard" />,
  );
  await user.click(
    screen.getByRole("radio", {
      name: "The portal refresh verifies who created the session.",
    }),
  );
  mounted.rerender(<CaseWorkspace {...props} systemId="knowledge_base" />);
  expect(screen.getByLabelText("Open question")).toHaveValue("device");
  expect(
    screen.getByRole("form", {
      name: /Construct finding: What is recorded for this exact device/,
    }),
  ).toBeVisible();
  mounted.rerender(<CaseWorkspace {...props} systemId="alert_dashboard" />);
  expect(
    screen.getByRole("radio", {
      name: "The portal refresh verifies who created the session.",
    }),
  ).toBeChecked();
});

it("starts with one plain task and does not leave editable assignment controls after sending", async () => {
  const user = userEvent.setup();
  let state = initial();
  const props = {
    eventId: "handoff-1",
    systemId: "email" as const,
    pending: false,
    onAction: vi.fn(),
    onOpenSystem: vi.fn(),
    onWorkplaceInteraction: vi.fn(async () => {
      throw new Error("offline");
    }),
  };
  const mounted = render(
    <CaseCommunication {...props} view={toClientView(state)} />,
  );
  expect(screen.queryByRole("radio")).toBeNull();
  expect(screen.queryByText(/Your memo must let the reviewer/)).toBeNull();
  await user.click(
    screen.getByRole("button", { name: "Read incoming assignment" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not open this item",
  );
  state = applyWorkplaceInteraction(state, {
    type: "open_artifact",
    artifactId: "handoff-email",
  }).state;
  mounted.rerender(<CaseCommunication {...props} view={toClientView(state)} />);
  expect(
    screen.getByRole("button", { name: "Start this case · tell your manager" }),
  ).toBeVisible();
  const view = toClientView(state);
  mounted.rerender(
    <CaseCommunication
      {...props}
      view={{
        ...view,
        events: view.events.map((e) =>
          e.id === "handoff-1" ? { ...e, status: "resolved" } : e,
        ),
      }}
    />,
  );
  expect(screen.queryByRole("radio")).toBeNull();
});

it("explains a saved claim and its missing sources without certifying it", async () => {
  const { caseActionFeedback, sourceFeedback } =
    await import("../src/caseFeedback.js");
  const view = toClientView(initial());
  const action = view.caseActions?.find(
    (a) => a.id === "update_ticket_notes" && a.eventId === "suspicious-login-1",
  );
  if (!action) throw new Error("Missing case draft action");
  const finding = { questionId: "route", rowIds: [], claimId: "route-city" };
  const sent = {
    ...action,
    ticketPayload: {
      ticketId: "ticket-suspicious-login-1",
      reasoning: {
        version: "desk-options-v1" as const,
        evidence: [],
        context: [],
        uncertainty: [],
        nextStep: [],
        caseFindings: [finding],
      },
    },
  };
  const message = caseActionFeedback(sent, view);
  expect(message).toContain("The shared city");
  expect(message).toContain("No source rows");
  expect(message).toContain("case stays open");
  expect(message).not.toMatch(/correct|supported|completed/);
  expect(
    sourceFeedback(view, "login-session-timeline", "artifact_reopened"),
  ).toMatch(/reopened.*findings unchanged/i);
});

it("hints address the question the player chose, even when investigating out of order", () => {
  const view = toClientView(initial());
  expect(
    getOptionalShiftHints(
      view,
      "seated_monitor",
      "suspicious-login-1",
      "device",
    )[0],
  ).toMatch(/exact laptop label.*inventory/);
  expect(
    getOptionalShiftHints(
      view,
      "seated_monitor",
      "suspicious-login-1",
      "route",
    )[0],
  ).toMatch(/earlier session, flagged session, and VPN/);
});

it("keeps visible help in sync with an out-of-order question across tools", async () => {
  const user = userEvent.setup();
  const state = initial();
  const assignment = state.events.find((e) => e.id === "handoff-1");
  if (!assignment) throw new Error("Missing assignment");
  assignment.status = "resolved";
  const rivera = state.events.find((e) => e.id === "login-help-1");
  if (!rivera) throw new Error("Missing Rivera case");
  rivera.status = "active";
  const view = toClientView(state);
  render(
    <OsSessionProvider>
      <ShiftHints view={view} phase="seated_monitor" />
      <OpsConsole view={view} onAction={vi.fn()} />
    </OsSessionProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Need a hint? (H)" }));
  const help = screen.getByText("Optional hint").closest("[role=status]");
  expect(help).toHaveTextContent("Open the session timeline in Alerts");
  await user.selectOptions(screen.getByLabelText("Open question"), "device");
  expect(screen.getByRole("button", { name: "Guides" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(help).toHaveTextContent("exact laptop label");
  expect(help).not.toHaveTextContent("Open the session timeline");
  await user.selectOptions(screen.getByLabelText("Open question"), "route");
  expect(screen.getByRole("button", { name: "Alerts" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(help).toHaveTextContent(
    "earlier session, flagged session, and VPN connection rows",
  );
  await user.click(screen.getByRole("button", { name: "Dismiss hint" }));
  expect(
    screen.getByRole("button", { name: "Need a hint? (H)" }),
  ).toHaveFocus();
  expect(screen.queryByText("Optional hint")).toBeNull();
  await user.selectOptions(screen.getByLabelText("Current case"), rivera.id);
  await user.click(screen.getByRole("button", { name: "Need a hint? (H)" }));
  expect(screen.getByRole("button", { name: "Alerts" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(
    screen.getByText("Optional hint").closest("[role=status]"),
  ).toHaveTextContent("In Alerts, open Rivera’s sign-in and device records");
  expect(
    within(
      screen.getByRole("form", {
        name: "Construct finding: What differs between Rivera's phone and laptop?",
      }),
    ).getByRole("button", { name: "Open Authentication summary · A. Rivera" }),
  ).toBeVisible();
});
