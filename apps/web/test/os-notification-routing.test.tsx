// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientNotification, ClientView } from "@sim/schemas";
import type { NotificationHandler } from "../src/components/shared.js";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import {
  createInitialOsSession,
  osSessionReducer,
  OsSessionProvider,
} from "../src/world/deskOs/osSession.js";

const notification: ClientNotification = {
  id: "email-arrived",
  eventId: "email-1",
  systemId: "email",
  title: "Email arrived",
  body: "Review the linked message.",
  priority: "high",
  status: "unread",
  canSnooze: true,
};

function makeView(status: ClientNotification["status"] = "unread"): ClientView {
  return {
    sessionId: "session-1",
    sessionKind: "assessed",
    simClock: 42,
    currentLocation: {
      id: "operations-center",
      name: "Security Operations Center",
      connectedLocationIds: [],
      interactableIds: [],
    },
    events: [
      {
        id: "email-1",
        category: "main_case",
        title: "Linked email case",
        summary: "Check the message.",
        priority: "high",
        systemId: "email",
        status: "active",
        deadlineAt: 180,
        completedActionIds: [],
        observedArtifactIds: [],
      },
    ],
    availableActions: [],
    operationalMessages: [],
    pacingMode: "standard",
    artifacts: [],
    ticketNotes: {},
    notebook: "",
    kbQuery: "",
    tasks: [],
    notifications: [{ ...notification, status }],
    queryResults: [],
    workplace: {
      energy: { current: 80, max: 100 },
      carriedSnackBites: 0,
      fridgeSnackBars: 2,
      fridgeOpen: false,
      coffeeServings: 2,
      coffeeStage: "idle",
      julesTopicsSeen: [],
      emergencyRecoveryUsed: false,
    },
  };
}

function setup() {
  let applied: (() => void) | undefined;
  const onAction = vi.fn(),
    onTaskAttempt = vi.fn(),
    onWorkplaceInteraction = vi.fn();
  const onNotification = vi.fn<NotificationHandler>(
    async (_notice, response, onApplied) => {
      if (response === "handle") applied = onApplied;
    },
  );
  const tree = (view: ClientView) => (
    <OsSessionProvider>
      <DeskOs
        phase="seated_monitor"
        view={view}
        onAction={onAction}
        onTaskAttempt={onTaskAttempt}
        onNotification={onNotification}
        onWorkplaceInteraction={onWorkplaceInteraction}
        onLoginSuccess={() => undefined}
        onStand={() => undefined}
        onOsFullscreen={() => undefined}
      />
    </OsSessionProvider>
  );
  const mounted = render(tree(makeView()));
  return {
    onNotification,
    apply: () => {
      mounted.rerender(tree(makeView("acknowledged")));
      act(() => {
        applied?.();
      });
    },
    expectNavigationOnly: () => {
      expect(onAction).not.toHaveBeenCalled();
      expect(onTaskAttempt).not.toHaveBeenCalled();
      expect(onWorkplaceInteraction).not.toHaveBeenCalled();
    },
    mounted,
    tree,
  };
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
describe("workspace notification routing", () => {
  it("shows unread work on its tool, routes only on accepted callback, and focuses linked case", async () => {
    const user = userEvent.setup();
    const { onNotification, apply, expectNavigationOnly } = setup();
    await user.click(screen.getByRole("button", { name: "Tickets" }));
    expect(
      within(screen.getByRole("button", { name: "Email" })).getByLabelText(
        "1 unread",
      ),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Handle now" }));
    expect(onNotification).toHaveBeenCalledWith(
      notification,
      "handle",
      expect.any(Function),
    );
    expect(screen.getByRole("button", { name: "Tickets" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    apply();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Linked email case" }),
      ).toHaveFocus();
    });
    expect(screen.getByRole("button", { name: "Email" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("combobox", { name: "Current case" })).toHaveValue(
      "email-1",
    );
    expect(
      screen.queryByRole("complementary", { name: "Work notification" }),
    ).toBeNull();
    expectNavigationOnly();
  });
  it.each(["snooze", "continue"] as const)(
    "%s never navigates or later applies a cancelled Handle",
    async (response) => {
      const user = userEvent.setup();
      const { onNotification, apply, expectNavigationOnly } = setup();
      await user.click(screen.getByRole("button", { name: "Guides" }));
      await user.click(screen.getByRole("button", { name: "Handle now" }));
      await user.click(
        screen.getByRole("button", {
          name:
            response === "snooze"
              ? "Snooze 15 minutes"
              : "Continue current case",
        }),
      );
      expect(onNotification).toHaveBeenLastCalledWith(notification, response);
      apply();
      expect(screen.getByRole("button", { name: "Guides" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expectNavigationOnly();
    },
  );
  it("retains accepted routing across DeskOs unmount and ignores stale delivery callbacks", () => {
    let state = createInitialOsSession();
    state = osSessionReducer(state, {
      type: "open_tool",
      systemId: "ticket_queue",
      eventId: "old-case",
    });
    state = osSessionReducer(state, {
      type: "queue_workspace_notification",
      notificationId: "first",
      eventId: "first-case",
      systemId: "email",
    });
    state = osSessionReducer(state, {
      type: "queue_workspace_notification",
      notificationId: "second",
      eventId: "second-case",
      systemId: "team_chat",
    });
    const pending = state;
    expect(
      osSessionReducer(state, {
        type: "apply_workspace_notification",
        requestId: 1,
      }),
    ).toBe(pending);
    state = osSessionReducer(state, {
      type: "apply_workspace_notification",
      requestId: 2,
    });
    expect(state.workspace).toMatchObject({
      systemId: "team_chat",
      eventId: "second-case",
    });
    expect(state.workspaceNotification).toBeNull();
  });
});

it("applies a retained notification callback while the desk is unmounted, then resumes the linked case", async () => {
  const user = userEvent.setup();
  let accepted: (() => void) | undefined;
  const onNotification: NotificationHandler = async (
    _notification,
    _response,
    onApplied,
  ) => {
    accepted = onApplied;
  };
  const tree = (visible: boolean, view: ClientView) => (
    <OsSessionProvider>
      {visible ? (
        <DeskOs
          phase="seated_monitor"
          view={view}
          onAction={vi.fn()}
          onNotification={onNotification}
          onLoginSuccess={vi.fn()}
          onStand={vi.fn()}
          onOsFullscreen={vi.fn()}
        />
      ) : null}
    </OsSessionProvider>
  );
  const mounted = render(tree(true, makeView()));
  await user.click(screen.getByRole("button", { name: "Handle now" }));
  mounted.rerender(tree(false, makeView()));
  act(() => {
    accepted?.();
  });
  mounted.rerender(tree(true, makeView("acknowledged")));
  expect(screen.getByRole("button", { name: "Email" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("combobox", { name: "Current case" })).toHaveValue(
    "email-1",
  );
  expect(
    screen.getByRole("heading", { name: "Linked email case" }),
  ).toHaveFocus();
});
