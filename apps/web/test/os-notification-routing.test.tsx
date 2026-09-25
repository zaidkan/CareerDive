// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
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
import {
  emptyWindowState,
  openWindow,
} from "../src/world/deskOs/os/windows.js";

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
  const onAction = vi.fn();
  const onTaskAttempt = vi.fn();
  const onWorkplaceInteraction = vi.fn();
  const onNotification = vi.fn<NotificationHandler>(
    async (_notification, response, onApplied) => {
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
  const frame = (id: string) => {
    const node = mounted.container.querySelector<HTMLElement>(
      `[data-window-id="${id}"]`,
    );
    if (!node) throw new Error(`Window ${id} missing`);
    return within(node);
  };
  const notificationHost = () =>
    within(screen.getByRole("complementary", { name: "Work notification" }));
  const apply = () => {
    if (!applied) throw new Error("Accepted-response callback missing");
    mounted.rerender(tree(makeView("acknowledged")));
    act(() => {
      applied?.();
    });
  };
  const expectNoOsCanonicalActions = () => {
    expect(onAction).not.toHaveBeenCalled();
    expect(onTaskAttempt).not.toHaveBeenCalled();
    expect(onWorkplaceInteraction).not.toHaveBeenCalled();
  };
  return {
    mounted,
    frame,
    notificationHost,
    onNotification,
    apply,
    expectNoOsCanonicalActions,
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("desktop notification routing", () => {
  it("keeps notification visible over focused Browser and routes only after accepted callback", async () => {
    const user = userEvent.setup();
    const {
      frame,
      notificationHost,
      onNotification,
      apply,
      expectNoOsCanonicalActions,
    } = setup();
    expect(
      notificationHost().getByRole("button", { name: "Handle now" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Browser, new work" }),
    ).toBeVisible();
    await user.click(frame("window-1").getByRole("tab", { name: "Dashboard" }));
    await user.click(
      notificationHost().getByRole("button", { name: "Handle now" }),
    );
    expect(onNotification).toHaveBeenCalledWith(
      notification,
      "handle",
      expect.any(Function),
    );
    expect(
      frame("window-1").getByRole("tab", { name: "Dashboard" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("button", { name: "Browser, active, new work" }),
    ).toBeVisible();
    apply();
    await waitFor(() => {
      expect(
        frame("window-1").getByRole("heading", { name: "Linked email case" }),
      ).toHaveFocus();
    });
    expect(
      frame("window-1").getByRole("tab", { name: "Email" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Browser" })).toBeVisible();
    expect(
      screen.queryByRole("complementary", { name: "Work notification" }),
    ).toBeNull();
    expectNoOsCanonicalActions();
  });

  it("raises background Browser after accepted response", async () => {
    const user = userEvent.setup();
    const { frame, notificationHost, apply, expectNoOsCanonicalActions } =
      setup();
    await user.click(screen.getByRole("button", { name: "Notes" }));
    expect(screen.getByRole("button", { name: "Notes, active" })).toBeVisible();
    expect(
      notificationHost().getByRole("button", { name: "Handle now" }),
    ).toBeVisible();
    await user.click(
      notificationHost().getByRole("button", { name: "Handle now" }),
    );
    expect(screen.getByRole("button", { name: "Notes, active" })).toBeVisible();
    apply();
    await waitFor(() => {
      expect(
        frame("window-1").getByRole("heading", { name: "Linked email case" }),
      ).toHaveFocus();
    });
    expect(
      screen.getByRole("button", { name: "Browser, active" }),
    ).toBeVisible();
    expectNoOsCanonicalActions();
  });

  it("restores minimized Browser after accepted response", async () => {
    const user = userEvent.setup();
    const { frame, notificationHost, apply, expectNoOsCanonicalActions } =
      setup();
    await user.click(
      frame("window-1").getByRole("button", { name: "Minimize Browser" }),
    );
    expect(screen.queryByRole("region", { name: "Browser" })).toBeNull();
    expect(
      notificationHost().getByRole("button", { name: "Handle now" }),
    ).toBeVisible();
    await user.click(
      notificationHost().getByRole("button", { name: "Handle now" }),
    );
    expect(screen.queryByRole("region", { name: "Browser" })).toBeNull();
    apply();
    await waitFor(() => {
      expect(
        frame("window-1").getByRole("heading", { name: "Linked email case" }),
      ).toHaveFocus();
    });
    expect(
      screen.getByRole("button", { name: "Browser, active" }),
    ).toBeVisible();
    expectNoOsCanonicalActions();
  });

  it("opens Browser when none exists, without opening before acknowledgement", async () => {
    const user = userEvent.setup();
    const { frame, notificationHost, apply, expectNoOsCanonicalActions } =
      setup();
    await user.click(
      frame("window-1").getByRole("button", { name: "Close Browser" }),
    );
    expect(
      notificationHost().getByRole("button", { name: "Handle now" }),
    ).toBeVisible();
    await user.click(
      notificationHost().getByRole("button", { name: "Handle now" }),
    );
    expect(screen.queryByRole("region", { name: "Browser" })).toBeNull();
    apply();
    await waitFor(() => {
      expect(
        frame("window-2").getByRole("heading", { name: "Linked email case" }),
      ).toHaveFocus();
    });
    expect(frame("window-2").getByLabelText("Address bar")).toHaveValue(
      "verdaly://ops",
    );
    expectNoOsCanonicalActions();
  });

  it("drops target when chosen Browser closes before acknowledgement", async () => {
    const user = userEvent.setup();
    const { frame, notificationHost, apply, expectNoOsCanonicalActions } =
      setup();
    await user.click(
      notificationHost().getByRole("button", { name: "Handle now" }),
    );
    await user.click(
      frame("window-1").getByRole("button", { name: "Close Browser" }),
    );
    apply();
    expect(screen.queryByRole("region", { name: "Browser" })).toBeNull();
    expect(screen.getByRole("button", { name: "Open Browser" })).toBeVisible();
    expectNoOsCanonicalActions();
  });

  it("keeps navigation draft when focused Browser already shows Ops Console", async () => {
    const user = userEvent.setup();
    const { frame, notificationHost, apply } = setup();
    await user.click(
      frame("window-1").getByRole("button", { name: "Company intranet" }),
    );
    await user.click(
      frame("window-1").getByRole("button", { name: "Go back" }),
    );
    const address = frame("window-1").getByLabelText("Address bar");
    await user.clear(address);
    await user.type(address, "unfinished address");
    await user.click(
      notificationHost().getByRole("button", { name: "Handle now" }),
    );
    apply();
    expect(frame("window-1").getByLabelText("Address bar")).toHaveValue(
      "unfinished address",
    );
    expect(
      frame("window-1").getByRole("button", { name: "Go forward" }),
    ).toBeEnabled();
  });

  it("returns focused Browser from intranet to Ops Console and preserves back history", async () => {
    const user = userEvent.setup();
    const { frame, notificationHost, apply, expectNoOsCanonicalActions } =
      setup();
    await user.click(
      frame("window-1").getByRole("button", { name: "Company intranet" }),
    );
    expect(
      frame("window-1").getByRole("article", { name: "Company intranet" }),
    ).toBeVisible();
    await user.click(
      notificationHost().getByRole("button", { name: "Handle now" }),
    );
    expect(
      frame("window-1").getByRole("article", { name: "Company intranet" }),
    ).toBeVisible();
    apply();
    await waitFor(() => {
      expect(
        frame("window-1").getByRole("heading", { name: "Linked email case" }),
      ).toHaveFocus();
    });
    expect(frame("window-1").getByLabelText("Address bar")).toHaveValue(
      "verdaly://ops",
    );
    expect(
      frame("window-1").getByRole("button", { name: "Go back" }),
    ).toBeEnabled();
    expectNoOsCanonicalActions();
  });

  it("routes into focused second Browser without changing first Browser", async () => {
    const user = userEvent.setup();
    const { frame, notificationHost, apply, expectNoOsCanonicalActions } =
      setup();
    await user.click(screen.getByRole("button", { name: "Open Browser" }));
    await user.click(
      frame("window-2").getByRole("button", { name: "Company intranet" }),
    );
    await user.click(
      notificationHost().getByRole("button", { name: "Handle now" }),
    );
    apply();
    await waitFor(() => {
      expect(
        frame("window-2").getByRole("heading", { name: "Linked email case" }),
      ).toHaveFocus();
    });
    expect(frame("window-1").getByLabelText("Address bar")).toHaveValue(
      "verdaly://ops",
    );
    expect(frame("window-2").getByLabelText("Address bar")).toHaveValue(
      "verdaly://ops",
    );
    expectNoOsCanonicalActions();
  });

  it("shows quiet attention and clears it after non-Handle response updates view", async () => {
    const user = userEvent.setup();
    const {
      mounted,
      notificationHost,
      onNotification,
      expectNoOsCanonicalActions,
    } = setup();
    expect(
      screen.getByRole("button", { name: "Browser, new work" }),
    ).toBeVisible();
    await user.click(
      notificationHost().getByRole("button", { name: "Snooze 15 minutes" }),
    );
    expect(onNotification).toHaveBeenCalledWith(notification, "snooze");
    mounted.rerender(
      <OsSessionProvider>
        <DeskOs
          phase="seated_monitor"
          view={makeView("snoozed")}
          onAction={() => undefined}
          onNotification={onNotification}
          onLoginSuccess={() => undefined}
          onStand={() => undefined}
          onOsFullscreen={() => undefined}
        />
      </OsSessionProvider>,
    );
    expect(screen.getByRole("button", { name: "Browser" })).toBeVisible();
    expect(
      screen.queryByRole("complementary", { name: "Work notification" }),
    ).toBeNull();
    expectNoOsCanonicalActions();
  });
});

describe("window cap and stale routing", () => {
  it("shows exact cosmetic cap toast without focus theft or canonical actions", () => {
    vi.useFakeTimers();
    const { onNotification, expectNoOsCanonicalActions } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Open Browser" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Files" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Notes" }));
    const launcher = screen.getByRole("button", { name: "Open Browser" });
    launcher.focus();
    fireEvent.click(launcher);
    expect(
      screen.getByText(
        "Up to 4 windows can be open at once. Close one to open another.",
      ),
    ).toHaveAttribute("role", "status");
    expect(launcher).toHaveFocus();
    expect(onNotification).not.toHaveBeenCalled();
    expectNoOsCanonicalActions();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(
      screen.queryByText(
        "Up to 4 windows can be open at once. Close one to open another.",
      ),
    ).toBeNull();
  });

  it("never evicts windows when no Browser can fit; stale callbacks cannot route newer targets", () => {
    let state = createInitialOsSession();
    const full = openWindow(
      openWindow(openWindow(emptyWindowState(), "browser"), "browser"),
      "files",
    );
    const four = openWindow(full, "notes");
    state = {
      ...state,
      windows: {
        ...four,
        windows: four.windows.map((window) => ({
          ...window,
          app: "files" as const,
        })),
      },
    };
    state = osSessionReducer(state, {
      type: "queue_notification_target",
      notificationId: "notice-1",
      windowId: null,
      eventId: "email-1",
      systemId: "email",
    });
    const before = state.windows;
    state = osSessionReducer(state, {
      type: "route_notification_target",
      requestId: 1,
      workspace: { w: 800, h: 600 },
    });
    expect(state.windows).toBe(before);
    expect(state.notificationTarget).toBeNull();
    state = osSessionReducer(state, {
      type: "queue_notification_target",
      notificationId: "notice-2",
      windowId: null,
      eventId: "email-1",
      systemId: "email",
    });
    const pending = state.notificationTarget;
    state = osSessionReducer(state, {
      type: "route_notification_target",
      requestId: 1,
      workspace: { w: 800, h: 600 },
    });
    expect(state.notificationTarget).toBe(pending);
  });
});
