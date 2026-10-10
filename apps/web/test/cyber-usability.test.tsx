// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  applyAction,
  applyWorkplaceInteraction,
  createInitialWorldState,
  toClientView,
} from "@sim/core";
import { SystemToolPanel } from "../src/components/SystemToolPanel.js";
import { HandoffBuilder } from "../src/components/tools/HandoffBuilder.js";
import { TicketComposer } from "../src/components/tools/TicketComposer.js";
import { SourceEvidence } from "../src/components/tools/SourceEvidence.js";

const fresh = () =>
  createInitialWorldState("cyber-ui", 7, {}, loadDefaultCybersecurityPack());
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
function SearchHarness() {
  const [state, setState] = useState(fresh);
  const [tab, setTab] = useState<"alert_dashboard" | "knowledge_base">(
    "alert_dashboard",
  );
  const view = toClientView(state);
  return (
    <>
      <button
        onClick={() => {
          setTab(
            tab === "alert_dashboard" ? "knowledge_base" : "alert_dashboard",
          );
        }}
      >
        Switch app
      </button>
      <SystemToolPanel
        key={tab}
        onOpenCaseSources={() => {
          setTab("alert_dashboard");
        }}
        view={view}
        selectedEventId="suspicious-login-1"
        systemId={tab}
        actions={view.availableActions.filter(
          ({ eventId }) => eventId === "suspicious-login-1",
        )}
        onAction={(action) => {
          setState(
            (current) =>
              applyAction(current, {
                id: action.id,
                eventId: action.eventId,
                actorId: "user",
                ...(action.queryPayload
                  ? { queryPayload: action.queryPayload }
                  : {}),
              }).state,
          );
        }}
        onWorkplaceInteraction={async (interaction) => {
          setState(
            (current) => applyWorkplaceInteraction(current, interaction).state,
          );
        }}
      />
    </>
  );
}
it("mounted case search discovers authored records, inspects/revisits and retains query across apps", async () => {
  const user = userEvent.setup();
  render(<SearchHarness />);
  const search = () => screen.getByRole("region", { name: "Record search" });
  await user.type(
    within(search()).getByLabelText("User"),
    "j.patel@example.com",
  );
  await user.click(
    within(search()).getByRole("button", { name: "Search records" }),
  );
  expect(
    within(search()).getByRole("article", { name: "Record AUTH-0741-PATEL" }),
  ).toBeVisible();
  await user.click(
    within(search()).getByRole("button", { name: "Inspect AUTH-0741-PATEL" }),
  );
  expect(
    within(search()).getByRole("button", { name: "Revisit AUTH-0741-PATEL" }),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Switch app" }));
  expect(
    screen.queryByRole("region", { name: "Record search" }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", {
      name: "Open case sources and record search in Alerts",
    }),
  );
  expect(within(search()).getByLabelText("User")).toHaveValue(
    "j.patel@example.com",
  );
  expect(
    within(search()).getByRole("button", { name: "Revisit AUTH-0741-PATEL" }),
  ).toBeVisible();
  await user.clear(within(search()).getByLabelText("User"));
  await user.type(within(search()).getByLabelText("User"), "no-such-account");
  await user.click(
    within(search()).getByRole("button", { name: "Search records" }),
  );
  expect(
    within(search()).getByText("No matching records for these filters."),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Switch app" }));
  expect(
    screen.queryByRole("region", { name: "Record search" }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", {
      name: "Open case sources and record search in Alerts",
    }),
  );
  expect(within(search()).getByLabelText("User")).toHaveValue(
    "no-such-account",
  );
  expect(screen.getByRole("region", { name: "Case evidence" })).toBeVisible();
});
it("handoff selections generate inspected references, preview actual work and persist on remount", async () => {
  const user = userEvent.setup();
  const state = applyWorkplaceInteraction(fresh(), {
    type: "open_artifact",
    artifactId: "login-session-timeline",
  }).state;
  const view = toClientView(state);
  const onAction = vi.fn();
  const action = {
    id: "submit_shift_handoff" as const,
    eventId: "shift-handoff-1",
    systemId: "team_chat" as const,
    label: "Send handoff",
    description: "Hand work forward.",
    simulatedMinutes: 5,
  };
  const props = { view, action, onAction, pending: false };
  const first = render(<HandoffBuilder {...props} />);
  expect(
    screen.queryByRole("checkbox", { name: /Device inventory/ }),
  ).toBeNull();
  await user.click(
    screen.getByRole("checkbox", { name: /S-0741 still needs senior review/ }),
  );
  expect(
    screen.getByRole("region", { name: "Handoff preview" }),
  ).toHaveTextContent("active");
  first.unmount();
  render(<HandoffBuilder {...props} />);
  expect(
    screen.getByRole("checkbox", { name: /S-0741 still needs senior review/ }),
  ).toBeChecked();
  expect(screen.queryByRole("textbox")).toBeNull();
  await user.click(
    screen.getByRole("button", { name: "Send handoff to next analyst" }),
  );
  expect(onAction).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", {
      name: "Confirm Send handoff to next analyst",
    }),
  );
  expect(onAction).toHaveBeenCalledWith(
    expect.objectContaining({
      handoffPayload: {
        sourceArtifactIds: ["login-session-timeline"],
        sourceRecordIds: [],
        followUp: "senior-review",
        selections: {
          version: "desk-options-v1",
          stateKey: view.handoffOptions?.stateKey,
          optionIds: ["carry-login"],
        },
      },
    }),
  );
});
it("ticket findings and disposition survive application remount without assessed textareas", async () => {
  const user = userEvent.setup();
  let state = fresh();
  for (const id of [
    "review_alert",
    "inspect_login_context",
    "inspect_account_history",
    "check_device_inventory",
  ] as const)
    state = applyAction(state, {
      id,
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
  const view = toClientView(state);
  const action = view.availableActions.find(
    ({ id }) => id === "document_ticket",
  );
  if (!action) throw new Error("Ticket not offered");
  const props = { view, action, onAction: vi.fn(), mutationState: {} };
  const first = render(<TicketComposer {...props} />);
  expect(
    screen.queryByRole("textbox", { name: "Verified evidence" }),
  ).toBeNull();
  await user.click(screen.getByRole("checkbox", { name: /Device inventory/ }));
  await user.click(screen.getAllByRole("radio")[0] as HTMLElement);
  first.unmount();
  render(<TicketComposer {...props} />);
  expect(
    screen.queryByRole("textbox", { name: "Verified evidence" }),
  ).toBeNull();
  expect(
    screen.getByRole("checkbox", { name: /Device inventory/ }),
  ).toBeChecked();
  expect(screen.getAllByRole("radio")[0]).toBeChecked();
});
it("finance response labels distinguish direct approval from identical source quotes", () => {
  const state = fresh();
  state.simClock = 20;
  const event = state.events.find(({ id }) => id === "access-request-1");
  if (!event) throw new Error("Missing event");
  event.status = "active";
  const task = toClientView(state).tasks.find(
    ({ id }) => id === "access-authority-check",
  );
  if (!task) throw new Error("Missing task");
  render(
    <SourceEvidence
      task={task}
      artifacts={[]}
      selected={[]}
      onToggle={vi.fn()}
      disabled={false}
    />,
  );
  expect(
    screen.getByRole("radio", {
      name: /Give temporary read-only access until 17:00/,
    }),
  ).toBeVisible();
  expect(
    screen.getByRole("radio", {
      name: /Route to the owner and offer an interim report/,
    }),
  ).toBeVisible();
});

it("saves weak option notes by keyboard without preselected answers or assessed text inputs", async () => {
  const user = userEvent.setup();
  const view = toClientView(fresh());
  const action = view.availableActions.find(
    (a) => a.id === "update_ticket_notes",
  );
  if (!action) throw new Error("Missing draft action");
  const onAction = vi.fn();
  const { container } = render(
    <TicketComposer
      view={view}
      action={action}
      onAction={onAction}
      mutationState={{}}
    />,
  );
  expect(container.querySelectorAll("textarea")).toHaveLength(0);
  expect(
    screen
      .getAllByRole("checkbox")
      .every((c) => !(c as HTMLInputElement).checked),
  ).toBe(true);
  const save = screen.getByRole("button", { name: "Save draft" });
  expect(save).toHaveClass("action-primary");
  save.focus();
  await user.keyboard("{Enter}");
  expect(onAction).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Confirm Save draft" }));
  expect(onAction).toHaveBeenCalledOnce();
  expect(onAction.mock.calls[0]?.[0]).toMatchObject({
    ticketPayload: {
      reasoning: { evidence: [], uncertainty: [], nextStep: [] },
    },
  });
});
it("does not resend a persisted decision when saving a correction, and locks choices while saving", async () => {
  const user = userEvent.setup();
  let state = fresh();
  for (const id of [
    "review_alert",
    "inspect_login_context",
    "inspect_account_history",
    "check_device_inventory",
  ] as const)
    state = applyAction(state, {
      id,
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
  state = applyAction(state, {
    id: "document_ticket",
    eventId: "suspicious-login-1",
    actorId: "user",
    decisionOptionId: "escalate-with-comparisons",
    ticketPayload: {
      ticketId: "ticket-suspicious-login-1",
      reasoning: {
        version: "desk-options-v1",
        evidence: [],
        context: [],
        uncertainty: [],
        nextStep: [],
      },
    },
  }).state;
  state = applyAction(state, {
    id: "escalate_alert",
    eventId: "suspicious-login-1",
    actorId: "user",
  }).state;
  const view = toClientView(state);
  const action = view.availableActions.find(
    (a) => a.id === "update_ticket_notes" && a.eventId === "suspicious-login-1",
  );
  if (!action) throw new Error("Missing correction action");
  const onAction = vi.fn();
  const props = { view, action, onAction, mutationState: {} };
  const { rerender } = render(<TicketComposer {...props} />);
  await user.click(
    screen.getByRole("button", { name: "Save note correction" }),
  );
  expect(onAction).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Confirm Save note correction" }),
  );
  expect(onAction.mock.calls[0]?.[0]).not.toHaveProperty("decisionOptionId");
  rerender(
    <TicketComposer {...props} mutationState={{ pendingKey: "saving" }} />,
  );
  expect(
    screen
      .getAllByRole("checkbox")
      .every((c) => (c as HTMLInputElement).disabled),
  ).toBe(true);
});
it("locks handoff checkboxes and next-owner controls during submission", () => {
  const view = toClientView(fresh());
  render(
    <HandoffBuilder
      view={view}
      action={{
        id: "submit_shift_handoff",
        eventId: "shift-handoff-1",
        systemId: "team_chat",
        label: "Send",
        description: "Send handoff",
        simulatedMinutes: 5,
      }}
      onAction={vi.fn()}
      pending
    />,
  );
  for (const input of [
    ...screen.getAllByRole("checkbox"),
    ...screen.getAllByRole("radio"),
  ])
    expect(input).toBeDisabled();
  expect(screen.queryByRole("textbox")).toBeNull();
});
it("renders the arrival handoff body only once with glossary and source links preserved", () => {
  const state = applyWorkplaceInteraction(fresh(), {
    type: "open_artifact",
    artifactId: "handoff-email",
  }).state;
  const view = toClientView(state);
  const body = state.artifacts["handoff-email"]?.body;
  if (!body) throw new Error("Missing handoff body");
  const { container } = render(
    <SystemToolPanel
      view={view}
      systemId="email"
      selectedEventId="handoff-1"
      actions={view.availableActions.filter((a) => a.eventId === "handoff-1")}
      onAction={vi.fn()}
      onWorkplaceInteraction={vi.fn().mockResolvedValue(undefined)}
    />,
  );
  expect(
    [...container.querySelectorAll("pre")].filter(
      (node) => node.textContent === body,
    ),
  ).toHaveLength(1);
  expect(screen.getByText("Record terms")).toBeInTheDocument();
  for (const term of [
    "MFA",
    "VPN",
    "ASN / ISP",
    "VLAN",
    "HQ",
    "Enrolled device / MDM",
  ])
    expect(screen.getByText(term)).toBeInTheDocument();
});
