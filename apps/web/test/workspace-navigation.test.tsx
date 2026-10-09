// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { createInitialWorldState, toClientView } from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { ClientView } from "@sim/schemas";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import {
  createInitialOsSession,
  osSessionReducer,
  OsSessionProvider,
} from "../src/world/deskOs/osSession.js";
import { workspaceObjective } from "../src/world/deskOs/workspaceObjective.js";
import { WORK_SYSTEMS } from "../src/systems.js";

const initial = () =>
  toClientView(
    createInitialWorldState(
      "workspace",
      24,
      {},
      loadDefaultCybersecurityPack(),
    ),
  );
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});
function tree(view: ClientView, onAction = vi.fn(), sessionId?: string) {
  return (
    <OsSessionProvider {...(sessionId ? { sessionId } : {})}>
      <DeskOs
        view={view}
        phase="seated_monitor"
        onAction={onAction}
        onLoginSuccess={() => undefined}
        onStand={() => undefined}
        onOsFullscreen={() => undefined}
      />
    </OsSessionProvider>
  );
}
it("has exactly five keyboard-operable tools and no competing OS navigation", async () => {
  const user = userEvent.setup();
  const view = initial(),
    before = JSON.stringify(view),
    onAction = vi.fn();
  const { container } = render(tree(view, onAction));
  const rail = screen.getByRole("navigation", { name: "Workstation tools" });
  expect(within(rail).getAllByRole("button")).toHaveLength(5);
  expect(screen.queryByRole("tablist")).toBeNull();
  expect(screen.queryByRole("toolbar", { name: "Taskbar" })).toBeNull();
  expect(container.querySelector("[data-window-id]")).toBeNull();
  expect(screen.queryByLabelText("Address bar")).toBeNull();
  for (const tool of WORK_SYSTEMS) {
    const button = within(rail).getByRole("button", { name: tool.label });
    button.focus();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("region", { name: tool.label })).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Current objective" }),
    ).toBeVisible();
  }
  expect(onAction).not.toHaveBeenCalled();
  expect(JSON.stringify(view)).toBe(before);
});
it("keeps a case across tools, shows a short navigation cue, and never chooses a disposition", async () => {
  const user = userEvent.setup();
  const onAction = vi.fn();
  const view = initial();
  render(tree(view, onAction));
  expect(screen.getByRole("button", { name: "Email" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(
    screen.getByRole("region", { name: "Current objective" }),
  ).toHaveTextContent("Which unfinished case will you take ownership of?");
  await user.click(screen.getByRole("button", { name: "Tickets" }));
  expect(screen.getByRole("combobox", { name: "Current case" })).toHaveValue(
    "handoff-1",
  );
  expect(screen.getByRole("button", { name: "Go to Email" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Go to Email" }));
  expect(screen.getByRole("heading", { name: "Shift handoff" })).toHaveFocus();
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Current case" }),
    "suspicious-login-1",
  );
  expect(
    screen.getByRole("region", { name: "Current objective" }),
  ).toHaveTextContent("What sequence created S-0741?");
  await user.click(screen.getByRole("button", { name: "Go to Alerts" }));
  expect(screen.getByRole("combobox", { name: "Current case" })).toHaveValue(
    "suspicious-login-1",
  );
  expect(onAction).not.toHaveBeenCalled();
});
it("updates the objective after canonical progress without forcing a tool switch", async () => {
  const user = userEvent.setup();
  const view = initial();
  const { rerender } = render(tree(view));
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Current case" }),
    "suspicious-login-1",
  );
  await user.click(screen.getByRole("button", { name: "Alerts" }));
  const note: ClientView = {
    ...view,
    structuredTickets: {
      "ticket-suspicious-login-1": {
        ticketId: "ticket-suspicious-login-1",
        linkedWorkItemIds: ["suspicious-login-1"],
        entityRefs: [],
        evidenceFactIds: [],
        status: "in_progress",
        revision: 1,
        reasoning: {
          version: "desk-options-v1",
          evidence: [],
          context: [],
          uncertainty: [],
          nextStep: [],
          caseFindings: ["signal", "route", "device", "coverage"].map(
            (questionId) => ({ questionId, rowIds: [], claimId: "pending" }),
          ),
        },
      },
    },
    availableActions: [
      {
        id: "document_ticket" as const,
        eventId: "suspicious-login-1",
        systemId: "ticket_queue" as const,
        label: "Document ticket",
        description: "Document the work.",
        simulatedMinutes: 20,
      },
    ],
  };
  rerender(tree(note));
  expect(
    screen.getByRole("region", { name: "Current objective" }),
  ).toHaveTextContent("What judgment and next check will your memo carry?");
  expect(screen.getByRole("button", { name: "Alerts" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("button", { name: "Tickets" })).toHaveAttribute(
    "data-next",
    "true",
  );
  expect(screen.getByRole("button", { name: "Go to Tickets" })).toBeVisible();
  const decision = {
    ...note,
    availableActions: [
      {
        ...note.availableActions[0],
        eventId: "suspicious-login-1",
        description: "Close the case.",
        simulatedMinutes: 15,
        id: "dismiss_alert" as const,
        systemId: "alert_dashboard" as const,
        label: "Close as expected activity",
      },
    ],
  };
  expect(workspaceObjective(decision, "suspicious-login-1").objective).toBe(
    "What judgment and next check will your memo carry?",
  );
});
it("persists selected tool/case and unassessed scratchpad through a full provider remount", async () => {
  const user = userEvent.setup();
  const view = initial();
  const mounted = render(tree(view, vi.fn(), "persisted-workspace"));
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Current case" }),
    "suspicious-login-1",
  );
  await user.click(screen.getByRole("button", { name: "Tickets" }));
  await user.click(screen.getByText("Personal scratchpad (optional)"));
  await user.type(screen.getByLabelText("Scratch notes"), "Compare IDs");
  mounted.unmount();
  render(tree(view, vi.fn(), "persisted-workspace"));
  expect(screen.getByRole("button", { name: "Tickets" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("combobox", { name: "Current case" })).toHaveValue(
    "suspicious-login-1",
  );
  await user.click(screen.getByText("Personal scratchpad (optional)"));
  expect(screen.getByLabelText("Scratch notes")).toHaveValue("Compare IDs");
});
it("reads legacy desktop drafts without reviving windows, losing notes, or replaying an intro", async () => {
  const user = userEvent.setup();
  sessionStorage.setItem(
    "desk-os:legacy-workspace",
    JSON.stringify({
      windows: { windows: [{ app: "browser" }] },
      notesText: "Keep this",
      morganIntroSeen: true,
    }),
  );
  render(tree(initial(), vi.fn(), "legacy-workspace"));
  expect(
    screen.getByRole("navigation", { name: "Workstation tools" }),
  ).toBeVisible();
  expect(screen.queryByRole("region", { name: "Browser" })).toBeNull();
  expect(screen.getByLabelText("Current case")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Tickets" }));
  await user.click(screen.getByText("Personal scratchpad (optional)"));
  expect(screen.getByLabelText("Scratch notes")).toHaveValue("Keep this");
  await user.click(screen.getByRole("button", { name: "Team chat" }));
  expect(screen.getByTestId("morgan-intro")).toBeVisible();
  const fresh = createInitialOsSession();
  expect(fresh.workspace).toBeUndefined();
  expect(
    osSessionReducer(fresh, { type: "mark_morgan_intro_seen" }).morganIntroSeen,
  ).toBe(true);
});
it("offers wrap-up in Team Chat and leaves recorded outcomes inspectable", () => {
  const view = initial();
  const finished: ClientView = {
    ...view,
    events: view.events.map((e) => ({ ...e, status: "resolved" })),
    availableActions: [
      {
        id: "complete_shift",
        eventId: "shift",
        systemId: "team_chat",
        label: "Finish shift",
        description: "Open your review.",
        simulatedMinutes: 0,
      },
    ],
    tasks: [],
  };
  render(tree(finished));
  expect(
    screen.getByRole("region", { name: "Current objective" }),
  ).toHaveTextContent("Ready to review your shift");
  expect(screen.getByRole("button", { name: "Team chat" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("button", { name: /Finish shift/ })).toBeVisible();
  expect(
    within(screen.getByRole("combobox", { name: "Current case" }))
      .getAllByRole("option")
      .every((o) => o.textContent.includes("recorded")),
  ).toBe(true);
});

it("sign-in leaves focus on the ready workstation, with no delayed heading focus theft", () => {
  const view = initial();
  const props = {
    view,
    onAction: vi.fn(),
    onLoginSuccess: vi.fn(),
    onStand: vi.fn(),
    onOsFullscreen: vi.fn(),
  };
  const mounted = render(
    <OsSessionProvider>
      <DeskOs {...props} phase="desk_login" />
    </OsSessionProvider>,
  );
  mounted.rerender(
    <OsSessionProvider>
      <DeskOs {...props} phase="seated_monitor" />
    </OsSessionProvider>,
  );
  expect(
    screen.getByRole("group", { name: "Verdaly workstation ready" }),
  ).toHaveFocus();
});
