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
import type { ClientTaskView, ClientView } from "@sim/schemas";
import type { SimulationClient } from "../src/client.js";
import { AccessibleMode } from "../src/components/AccessibleMode.js";
import { App } from "../src/index.js";
import { SystemToolPanel } from "../src/components/SystemToolPanel.js";
import { WorkSurface } from "../src/components/WorkSurface.js";
import type { NotificationHandler } from "../src/components/shared.js";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";
import { SystemApp } from "../src/world/deskOs/SystemApp.js";

vi.mock("../src/world/FloorMap.js", () => ({
  FloorMap: ({ onEnterRoom }: { onEnterRoom: (id: "soc") => void }) => (
    <button
      onClick={() => {
        onEnterRoom("soc");
      }}
      type="button"
    >
      Security Operations
    </button>
  ),
}));

vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: ({
    onBreakRoomExit,
    onInteract,
  }: {
    onBreakRoomExit: () => void;
    onInteract: (id: string) => void;
  }) => (
    <>
      <button
        onClick={() => {
          onInteract("desk_player");
        }}
        type="button"
      >
        Sit at desk
      </button>
      <button
        onClick={() => {
          onInteract("fridge");
        }}
        type="button"
      >
        Open fridge
      </button>
      <button onClick={onBreakRoomExit} type="button">
        Exit break room
      </button>
    </>
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (cause: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function first<T>(items: readonly T[]): T {
  const item = items[0];
  if (!item) throw new Error("Expected a non-empty test fixture");
  return item;
}

const reviewAction = {
  id: "review_alert" as const,
  eventId: "alert-1",
  systemId: "alert_dashboard" as const,
  label: "Review alert",
  description: "Review the alert details.",
  simulatedMinutes: 10,
};

function makeView(overrides: Partial<ClientView> = {}): ClientView {
  return {
    sessionId: "session-1",
    sessionKind: "tutorial",
    simClock: 10,
    currentLocation: {
      id: "operations-center",
      name: "Security Operations Center",
      connectedLocationIds: [],
      interactableIds: ["alert-dashboard"],
    },
    events: [
      {
        id: "alert-1",
        category: "main_case",
        title: "Review alert",
        summary: "A login needs review.",
        priority: "high",
        systemId: "alert_dashboard",
        status: "active",
        deadlineAt: 180,
        completedActionIds: [],
        observedArtifactIds: ["artifact-alert-1"],
      },
    ],
    availableActions: [reviewAction],
    operationalMessages: [],
    pacingMode: "practice",
    artifacts: [
      {
        id: "artifact-alert-1",
        systemId: "alert_dashboard",
        kind: "alert",
        title: "Alert A-1042",
        summary: "Unfamiliar login",
        body: "A login from an unfamiliar device.",
        eventIds: ["alert-1"],
        relatedArtifactIds: [],
        searchableText: "unfamiliar login",
        metadata: { device: "LT-204" },
        observed: true,
      },
    ],
    ticketNotes: {},
    notebook: "",
    kbQuery: "",
    tasks: [],
    notifications: [],
    queryResults: [],
    workplace: {
      energy: { current: 73, max: 100 },
      carriedSnackBites: 0,
      fridgeSnackBars: 2,
      fridgeOpen: false,
      coffeeServings: 2,
      coffeeStage: "idle",
      julesTopicsSeen: [],
      emergencyRecoveryUsed: false,
    },
    ...overrides,
  };
}

function makeClient(
  initialView: ClientView,
  overrides: Partial<SimulationClient> = {},
): SimulationClient {
  return {
    createSession: () =>
      Promise.resolve({ sessionId: initialView.sessionId, view: initialView }),
    performAction: () => Promise.resolve(initialView),
    performWorkplaceInteraction: () =>
      Promise.resolve({
        view: initialView,
        sequence: 1,
        feedback: "fridge_opened",
      }),
    submitTaskAttempt: () =>
      Promise.resolve({
        view: initialView,
        accepted: true,
        completed: true,
        feedback: "Task complete.",
      }),
    respondToNotification: () => Promise.resolve(initialView),
    getDebrief: () => Promise.reject(new Error("Not needed in Desk OS tests")),
    ...overrides,
  };
}

async function enterDesk(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("button", { name: /Enter the Verdaly floor/i }),
  );
  await user.click(screen.getByRole("button", { name: "Security Operations" }));
  await user.click(await screen.findByRole("button", { name: "Sit at desk" }));
  await user.type(screen.getByLabelText(/Username/i), "day1.analyst");
  await user.type(screen.getByLabelText(/Password/i), "FirstDay!");
  await user.click(screen.getByRole("button", { name: /^Login$/i }));
  await screen.findByRole("heading", { name: "Your workstation" });
}

function deskProps(view: ClientView) {
  return {
    onAction: () => undefined,
    onLoginSuccess: () => undefined,
    onOsFullscreen: () => undefined,
    onStand: () => undefined,
    phase: "seated_monitor" as const,
    view,
  };
}

function makeTask(overrides: Partial<ClientTaskView> = {}): ClientTaskView {
  return {
    id: "alert-review-task",
    eventId: "alert-1",
    actionId: "review_alert",
    systemId: "alert_dashboard",
    kind: "select_clues",
    title: "Review the alert evidence",
    prompt: "Which detail should you verify?",
    instruction: "Choose one detail.",
    whyItMatters: "Evidence supports a careful decision.",
    relatedArtifactIds: ["artifact-alert-1"],
    stepIndex: 0,
    stepCount: 2,
    options: [
      { id: "device", label: "Device identity" },
      { id: "browser", label: "Browser version" },
    ],
    minSelections: 1,
    maxSelections: 1,
    ...overrides,
  };
}

describe("Desk OS mutation coordination", () => {
  it("submits a rapid duplicate once and disables every canonical control while pending", async () => {
    const user = userEvent.setup();
    const pending = deferred<ClientView>();
    const performAction = vi.fn(() => pending.promise);
    const initialView = makeView({
      availableActions: [
        reviewAction,
        {
          ...reviewAction,
          id: "dismiss_alert",
          label: "Dismiss alert",
        },
      ],
      notifications: [
        {
          id: "new-alert",
          eventId: "alert-1",
          systemId: "alert_dashboard",
          title: "New work arrived",
          body: "Handle it when ready.",
          priority: "high",
          status: "unread",
          canSnooze: true,
        },
      ],
    });
    render(<App client={makeClient(initialView, { performAction })} />);
    await enterDesk(user);
    await user.click(screen.getByRole("tab", { name: /^Alerts/ }));

    const actionControls = screen.getByLabelText("Workplace actions");
    const review = within(actionControls).getByRole("button", {
      name: /Review alert/i,
    });
    await user.dblClick(review);

    expect(performAction).toHaveBeenCalledTimes(1);
    expect(
      within(actionControls).getByRole("button", { name: /Dismiss alert/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Handle now" })).toBeDisabled();
    expect(screen.getByText("Saving Review alert…")).toBeVisible();

    await act(async () => {
      pending.resolve(initialView);
      await pending.promise;
    });
  });

  it("keeps a late response from an old session from replacing the newer view", async () => {
    const user = userEvent.setup();
    const oldAction = deferred<ClientView>();
    const tutorialView = makeView();
    const staleView = makeView({
      events: [
        {
          ...first(tutorialView.events),
          title: "Stale tutorial response",
        },
      ],
    });
    const assessedView = makeView({
      sessionId: "assessed-session",
      sessionKind: "assessed",
      pacingMode: "standard",
      events: [
        {
          ...first(tutorialView.events),
          title: "Current assessed case",
        },
      ],
    });
    const createSession = vi.fn(
      (input: Parameters<SimulationClient["createSession"]>[0]) =>
        Promise.resolve(
          input.sessionKind === "tutorial"
            ? { sessionId: tutorialView.sessionId, view: tutorialView }
            : { sessionId: assessedView.sessionId, view: assessedView },
        ),
    );
    render(
      <App
        client={makeClient(tutorialView, {
          createSession,
          performAction: () => oldAction.promise,
        })}
      />,
    );
    await enterDesk(user);
    await user.click(screen.getByRole("tab", { name: /^Alerts/ }));
    await user.click(
      within(screen.getByLabelText("Workplace actions")).getByRole("button", {
        name: /Review alert/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /Skip practice/i }));
    await screen.findByText("Assessed shift");

    await act(async () => {
      oldAction.resolve(staleView);
      await oldAction.promise;
    });
    await enterDesk(user);
    await user.click(screen.getByRole("tab", { name: /^Alerts/ }));

    expect(
      screen.getByRole("heading", { name: "Current assessed case" }),
    ).toBeVisible();
    expect(screen.queryByText("Stale tutorial response")).toBeNull();
  });

  it("revokes queued workplace continuations before an assessed session starts", async () => {
    const user = userEvent.setup();
    const tutorialOpen =
      deferred<
        Awaited<ReturnType<SimulationClient["performWorkplaceInteraction"]>>
      >();
    const tutorialView = makeView();
    const openedTutorialView = makeView({
      workplace: { ...tutorialView.workplace, fridgeOpen: true },
    });
    const staleClosedView = makeView({
      events: [
        {
          ...first(tutorialView.events),
          title: "Stale tutorial close response",
        },
      ],
    });
    const assessedView = makeView({
      sessionId: "assessed-session",
      sessionKind: "assessed",
      pacingMode: "standard",
      events: [
        {
          ...first(tutorialView.events),
          title: "Current assessed case",
        },
      ],
    });
    const createSession = vi.fn(
      (input: Parameters<SimulationClient["createSession"]>[0]) =>
        Promise.resolve(
          input.sessionKind === "tutorial"
            ? { sessionId: tutorialView.sessionId, view: tutorialView }
            : { sessionId: assessedView.sessionId, view: assessedView },
        ),
    );
    const performWorkplaceInteraction = vi
      .fn<SimulationClient["performWorkplaceInteraction"]>()
      .mockImplementationOnce(() => tutorialOpen.promise)
      .mockResolvedValue({
        view: staleClosedView,
        sequence: 2,
        feedback: "fridge_closed",
      });
    render(
      <App
        client={makeClient(tutorialView, {
          createSession,
          performWorkplaceInteraction,
        })}
      />,
    );
    await user.click(
      await screen.findByRole("button", { name: /Enter the Verdaly floor/i }),
    );
    await user.click(
      screen.getByRole("button", { name: "Security Operations" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Open fridge" }),
    );
    await user.click(screen.getByRole("button", { name: "Exit break room" }));

    await user.click(screen.getByRole("button", { name: /Skip practice/i }));
    await screen.findByText("Assessed shift");

    await act(async () => {
      tutorialOpen.resolve({
        view: openedTutorialView,
        sequence: 1,
        feedback: "fridge_opened",
      });
      await tutorialOpen.promise;
    });

    await waitFor(() => {
      expect(performWorkplaceInteraction).toHaveBeenCalledTimes(1);
    });
    expect(performWorkplaceInteraction).toHaveBeenCalledWith("session-1", {
      type: "open_fridge",
    });

    await enterDesk(user);
    await user.click(screen.getByRole("tab", { name: /^Alerts/ }));
    expect(
      screen.getByRole("heading", { name: "Current assessed case" }),
    ).toBeVisible();
    expect(screen.queryByText("Stale tutorial close response")).toBeNull();
  });

  it("keeps failed canonical state unchanged and retries only the failed operation", async () => {
    const user = userEvent.setup();
    const initialView = makeView();
    const reviewedView = makeView({ simClock: 20, availableActions: [] });
    const performAction = vi
      .fn<SimulationClient["performAction"]>()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(reviewedView);
    render(<App client={makeClient(initialView, { performAction })} />);
    await enterDesk(user);
    await user.click(screen.getByRole("tab", { name: /^Alerts/ }));
    await user.click(
      within(screen.getByLabelText("Workplace actions")).getByRole("button", {
        name: /Review alert/i,
      }),
    );

    const desk = screen.getByTestId("desk-os-overlay");
    const error = await within(desk).findByRole("alert");
    expect(error).toHaveTextContent("That action could not be completed.");
    expect(screen.getByRole("heading", { name: "Review alert" })).toBeVisible();
    expect(screen.getByText("Due in 170m")).toBeVisible();

    await user.dblClick(within(error).getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(performAction).toHaveBeenCalledTimes(2);
    });
    expect(within(desk).queryByRole("alert")).toBeNull();
    expect(
      await within(desk).findByText("Review alert completed."),
    ).toBeVisible();
  });

  it.each([
    ["snooze", "Snooze 15 minutes"],
    ["continue", "Continue current case"],
  ] as const)(
    "does not release a failed Handle target after a successful %s response",
    async (_response, responseLabel) => {
      const user = userEvent.setup();
      const base = makeView();
      const initialView = makeView({
        events: [
          first(base.events),
          {
            ...first(base.events),
            id: "email-1",
            systemId: "email",
            title: "Handle-linked email",
          },
        ],
        notifications: [
          {
            id: "email-arrived",
            eventId: "email-1",
            systemId: "email",
            title: "Email arrived",
            body: "Review the linked message.",
            priority: "high",
            status: "unread",
            canSnooze: true,
          },
        ],
      });
      const updatedView = makeView({
        ...initialView,
        notifications: [
          {
            ...first(initialView.notifications),
            status: "acknowledged",
          },
        ],
      });
      const respondToNotification = vi
        .fn<SimulationClient["respondToNotification"]>()
        .mockRejectedValueOnce(new Error("network down"))
        .mockResolvedValueOnce(updatedView);
      render(
        <App client={makeClient(initialView, { respondToNotification })} />,
      );
      await enterDesk(user);
      await user.click(screen.getByRole("tab", { name: "Dashboard" }));
      expect(
        screen.getByRole("heading", { name: "Your workstation" }),
      ).toBeVisible();

      await user.click(screen.getByRole("button", { name: "Handle now" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "That notification choice could not be saved.",
      );
      await user.click(screen.getByRole("button", { name: responseLabel }));

      await waitFor(() => {
        expect(respondToNotification).toHaveBeenCalledTimes(2);
      });
      expect(
        screen.getByRole("heading", { name: "Your workstation" }),
      ).toBeVisible();
      expect(screen.getByRole("tab", { name: "Email" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
      expect(
        screen.queryByRole("heading", { name: "Handle-linked email" }),
      ).toBeNull();
    },
  );

  it("focuses the linked work only when a failed Handle retry is applied", async () => {
    const user = userEvent.setup();
    const retry = deferred<ClientView>();
    const base = makeView();
    const initialView = makeView({
      events: [
        first(base.events),
        {
          ...first(base.events),
          id: "email-1",
          systemId: "email",
          title: "Retried Handle email",
        },
      ],
      notifications: [
        {
          id: "email-arrived",
          eventId: "email-1",
          systemId: "email",
          title: "Email arrived",
          body: "Review the linked message.",
          priority: "high",
          status: "unread",
          canSnooze: true,
        },
      ],
    });
    const handledView = makeView({
      ...initialView,
      notifications: [
        {
          ...first(initialView.notifications),
          status: "acknowledged",
        },
      ],
    });
    const respondToNotification = vi
      .fn<SimulationClient["respondToNotification"]>()
      .mockRejectedValueOnce(new Error("network down"))
      .mockImplementationOnce(() => retry.promise);
    render(<App client={makeClient(initialView, { respondToNotification })} />);
    await enterDesk(user);
    await user.click(screen.getByRole("tab", { name: "Dashboard" }));
    await user.click(screen.getByRole("button", { name: "Handle now" }));

    const error = await screen.findByRole("alert");
    await user.click(within(error).getByRole("button", { name: "Retry" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Saving change…")).toBeVisible();

    await act(async () => {
      retry.resolve(handledView);
      await retry.promise;
    });

    const heading = await screen.findByRole("heading", {
      name: "Retried Handle email",
    });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
  });

  it("re-announces an identical retry failure without an unhandled rejection", async () => {
    const user = userEvent.setup();
    const retry = deferred<ClientView>();
    const initialView = makeView({
      notifications: [
        {
          id: "alert-arrived",
          eventId: "alert-1",
          systemId: "alert_dashboard",
          title: "Alert arrived",
          body: "Review the linked case.",
          priority: "high",
          status: "unread",
          canSnooze: true,
        },
      ],
    });
    const respondToNotification = vi
      .fn<SimulationClient["respondToNotification"]>()
      .mockRejectedValueOnce(new Error("network down"))
      .mockImplementationOnce(() => retry.promise);
    render(<App client={makeClient(initialView, { respondToNotification })} />);
    await enterDesk(user);
    await user.click(screen.getByRole("button", { name: "Handle now" }));

    const firstError = await screen.findByRole("alert");
    await user.click(within(firstError).getByRole("button", { name: "Retry" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Saving change…")).toBeVisible();

    await act(async () => {
      retry.reject(new Error("network down"));
      await expect(retry.promise).rejects.toThrow("network down");
    });

    const repeatedError = await screen.findByRole("alert");
    expect(repeatedError).not.toBe(firstError);
    expect(repeatedError).toHaveTextContent(
      "That notification choice could not be saved.",
    );
    expect(repeatedError).toHaveFocus();
    expect(respondToNotification).toHaveBeenCalledTimes(2);
  });

  it("persistently confirms a successful utility save", async () => {
    const user = userEvent.setup();
    const ticketAction = {
      id: "update_ticket_notes" as const,
      eventId: "alert-1",
      systemId: "ticket_queue" as const,
      label: "Update investigation notes",
      description: "Save current findings.",
      simulatedMinutes: 0,
    };
    const initialView = makeView({
      availableActions: [ticketAction],
      artifacts: [
        {
          ...first(makeView().artifacts),
          id: "ticket-1",
          systemId: "ticket_queue",
          kind: "ticket",
          title: "Ticket A-1042",
        },
      ],
    });
    const savedView = makeView({
      ...initialView,
      ticketNotes: { "alert-1": "Checked device inventory" },
    });
    const performAction = vi.fn(() => Promise.resolve(savedView));
    render(<App client={makeClient(initialView, { performAction })} />);
    await enterDesk(user);
    await user.click(screen.getByRole("tab", { name: "Tickets" }));
    await user.type(
      screen.getByLabelText("Investigation notes"),
      "Checked device inventory",
    );
    await user.click(
      screen.getByRole("button", { name: /Save update investigation notes/i }),
    );

    expect(await screen.findByText("Investigation notes saved.")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Dashboard" }));
    expect(screen.getByText("Investigation notes saved.")).toBeVisible();
  });
});

describe("Desk OS canonical state rendering", () => {
  it("uses relative deadlines and keeps resolved work in collapsed history", async () => {
    const user = userEvent.setup();
    const base = makeView();
    const view = makeView({
      events: [
        first(base.events),
        {
          ...first(base.events),
          id: "escalated-1",
          title: "Escalated case",
          status: "escalated",
          deadlineAt: 5,
        },
        {
          ...first(base.events),
          id: "resolved-1",
          title: "Resolved case",
          status: "resolved",
          deadlineAt: 40,
        },
        {
          ...first(base.events),
          id: "expired-1",
          title: "Expired case",
          status: "expired",
          deadlineAt: 8,
        },
        {
          ...first(base.events),
          id: "pending-1",
          title: "Hidden pending case",
          status: "pending",
        },
      ],
      workplace: {
        ...base.workplace,
        energy: { current: 73, max: 100 },
      },
    });
    render(
      <OsSessionProvider>
        <DeskOs {...deskProps(view)} />
      </OsSessionProvider>,
    );

    const rail = screen.getByRole("complementary", { name: "Current shift" });
    expect(within(rail).getByText("2 open")).toBeVisible();
    expect(screen.getAllByText("Due in 170m").length).toBeGreaterThan(0);
    expect(
      within(rail).queryByRole("button", { name: /Resolved case/i }),
    ).toBeNull();
    expect(
      within(rail).queryByRole("button", { name: /Expired case/i }),
    ).toBeNull();
    expect(within(rail).getByText("Closed history (2)")).toBeVisible();
    expect(screen.queryByText("Hidden pending case")).toBeNull();

    await user.click(
      within(screen.getByLabelText("Alerts items")).getByRole("button", {
        name: /Escalated case/i,
      }),
    );
    expect(screen.getByText("Due in 0m")).toBeVisible();

    const status = screen.getByLabelText("Workstation status");
    expect(status).toHaveTextContent("08:10");
    expect(status).toHaveTextContent("Energy 73/100");
  });

  it("keeps dirty notes per action and event while refreshing clean canonical values", async () => {
    const user = userEvent.setup();
    const base = makeView();
    const actionA = {
      id: "update_ticket_notes" as const,
      eventId: "alert-1",
      systemId: "ticket_queue" as const,
      label: "Update investigation notes",
      description: "Save notes.",
      simulatedMinutes: 0,
    };
    const actionB = { ...actionA, eventId: "alert-2" };
    let view = makeView({
      events: [
        { ...first(base.events), systemId: "ticket_queue" },
        {
          ...first(base.events),
          id: "alert-2",
          title: "Second case",
          systemId: "ticket_queue",
        },
      ],
      availableActions: [actionA, actionB],
      ticketNotes: {
        "alert-1": "First canonical note",
        "alert-2": "Second canonical note",
      },
    });
    const renderSystem = () => (
      <SystemApp
        guidance={null}
        onAction={() => undefined}
        systemId="ticket_queue"
        view={view}
      />
    );
    const rendered = render(renderSystem());
    const notes = screen.getByLabelText("Investigation notes");
    await user.clear(notes);
    await user.type(notes, "Unsaved first draft");

    view = {
      ...view,
      ticketNotes: { ...view.ticketNotes, "alert-1": "Server refresh" },
    };
    rendered.rerender(renderSystem());
    expect(screen.getByLabelText("Investigation notes")).toHaveValue(
      "Unsaved first draft",
    );

    await user.click(screen.getByRole("button", { name: /Second case/i }));
    expect(screen.getByLabelText("Investigation notes")).toHaveValue(
      "Second canonical note",
    );

    view = {
      ...view,
      ticketNotes: { ...view.ticketNotes, "alert-2": "Second refreshed note" },
    };
    rendered.rerender(renderSystem());
    expect(screen.getByLabelText("Investigation notes")).toHaveValue(
      "Second refreshed note",
    );

    await user.click(screen.getByRole("button", { name: /Review alert/i }));
    expect(screen.getByLabelText("Investigation notes")).toHaveValue(
      "Unsaved first draft",
    );
  });

  it("waits for the canonical notification view before focusing its linked event", async () => {
    const user = userEvent.setup();
    const response = deferred<ClientView>();
    const base = makeView();
    const initialView = makeView({
      events: [
        first(base.events),
        {
          ...first(base.events),
          id: "alert-2",
          title: "Linked notification case",
        },
      ],
      notifications: [
        {
          id: "alert-arrived",
          eventId: "alert-2",
          systemId: "alert_dashboard",
          title: "Alert arrived",
          body: "Review the linked case.",
          priority: "high",
          status: "unread",
          canSnooze: true,
        },
      ],
    });
    const updatedView = makeView({
      ...initialView,
      notifications: [
        {
          ...first(initialView.notifications),
          status: "acknowledged",
        },
      ],
    });
    render(
      <App
        client={makeClient(initialView, {
          respondToNotification: () => response.promise,
        })}
      />,
    );
    await enterDesk(user);
    const handle = screen.getByRole("button", { name: "Handle now" });
    await user.click(handle);
    expect(handle).toBeDisabled();

    await act(async () => {
      response.resolve(updatedView);
      await response.promise;
    });

    const heading = await screen.findByRole("heading", {
      name: "Linked notification case",
    });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
  });

  it("keeps step feedback through transition and confirms final task completion", async () => {
    const user = userEvent.setup();
    const step0 = makeTask();
    const step1 = makeTask({
      stepIndex: 1,
      prompt: "Which follow-up is appropriate?",
      options: [
        { id: "document", label: "Document the evidence" },
        { id: "ignore", label: "Ignore the alert" },
      ],
    });
    const initialView = makeView({
      availableActions: [{ ...reviewAction, taskId: step0.id }],
      tasks: [step0],
    });
    const nextView = makeView({
      availableActions: [{ ...reviewAction, taskId: step1.id }],
      tasks: [step1],
    });
    const finalView = makeView({
      availableActions: [],
      tasks: [],
      events: [
        {
          ...first(makeView().events),
          status: "resolved",
          resolution: "Evidence documented.",
        },
      ],
    });
    const submitTaskAttempt = vi
      .fn<SimulationClient["submitTaskAttempt"]>()
      .mockResolvedValueOnce({
        view: nextView,
        accepted: true,
        completed: false,
        feedback: "Evidence selected.",
      })
      .mockResolvedValueOnce({
        view: finalView,
        accepted: true,
        completed: true,
        feedback: "Evidence documented.",
      });
    render(<App client={makeClient(initialView, { submitTaskAttempt })} />);
    await enterDesk(user);
    await user.click(screen.getByRole("tab", { name: /^Alerts/ }));
    await user.click(screen.getByLabelText("Device identity"));
    await user.click(screen.getByRole("button", { name: "Check my work" }));

    await screen.findByText("Step 1 complete. Evidence selected.");
    const stepFeedback = screen.getByText("Evidence selected.");
    expect(screen.getByText("Work step 2 of 2")).toBeVisible();
    expect(stepFeedback).toHaveFocus();

    await user.click(screen.getByLabelText("Document the evidence"));
    await user.click(screen.getByRole("button", { name: "Check my work" }));

    const finalFeedback = await screen.findByText(
      "Task complete. Evidence documented.",
    );
    expect(finalFeedback).toHaveFocus();
  });
});

describe("notification focus parity", () => {
  function notificationView() {
    const base = makeView();
    return makeView({
      events: [
        first(base.events),
        {
          ...first(base.events),
          id: "email-1",
          systemId: "email",
          title: "Structured Handle email",
        },
      ],
      notifications: [
        {
          id: "email-arrived",
          eventId: "email-1",
          systemId: "email",
          title: "Email arrived",
          body: "Review the linked message.",
          priority: "high",
          status: "unread",
          canSnooze: true,
        },
      ],
    });
  }

  it("keeps WorkSurface and structured focus unchanged after failed Handle and alternate success", async () => {
    const user = userEvent.setup();
    const view = notificationView();
    const workNotification = vi.fn<NotificationHandler>(async () => undefined);
    const work = render(
      <WorkSurface
        onAction={() => undefined}
        onNotification={workNotification}
        view={view}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Handle now" }));
    await user.click(screen.getByRole("button", { name: "Snooze 15 minutes" }));
    expect(screen.getByRole("heading", { name: "Review alert" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Structured Handle email" }),
    ).toBeNull();
    work.unmount();

    const structuredNotification = vi.fn<NotificationHandler>(
      async () => undefined,
    );
    render(
      <AccessibleMode
        onAction={() => undefined}
        onNotification={structuredNotification}
        view={view}
      />,
    );
    const structuredTarget = document.getElementById(
      "structured-event-email-1",
    );
    if (!structuredTarget) throw new Error("Expected structured email target");

    await user.click(screen.getByRole("button", { name: "Handle now" }));
    await user.click(
      screen.getByRole("button", { name: "Continue current case" }),
    );
    expect(structuredTarget).not.toHaveFocus();
  });

  it("uses the retained Handle callback after a successful retry in both modes", async () => {
    const user = userEvent.setup();
    const view = notificationView();
    let applyWorkHandle: (() => void) | undefined;
    const workNotification = vi.fn<NotificationHandler>(
      async (_notification, response, onApplied) => {
        if (response === "handle") applyWorkHandle = onApplied;
      },
    );
    const work = render(
      <WorkSurface
        onAction={() => undefined}
        onNotification={workNotification}
        view={view}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Handle now" }));
    expect(screen.getByRole("heading", { name: "Review alert" })).toBeVisible();
    act(() => {
      applyWorkHandle?.();
    });
    expect(
      screen.getByRole("heading", { name: "Structured Handle email" }),
    ).toBeVisible();
    work.unmount();

    let applyStructuredHandle: (() => void) | undefined;
    const structuredNotification = vi.fn<NotificationHandler>(
      async (_notification, response, onApplied) => {
        if (response === "handle") applyStructuredHandle = onApplied;
      },
    );
    render(
      <AccessibleMode
        onAction={() => undefined}
        onNotification={structuredNotification}
        view={view}
      />,
    );
    const structuredTarget = document.getElementById(
      "structured-event-email-1",
    );
    if (!structuredTarget) throw new Error("Expected structured email target");

    await user.click(screen.getByRole("button", { name: "Handle now" }));
    expect(structuredTarget).not.toHaveFocus();
    act(() => {
      applyStructuredHandle?.();
    });
    await waitFor(() => {
      expect(structuredTarget).toHaveFocus();
    });
  });
});

describe("Desk OS selection, task, and expansion reliability", () => {
  it("moves focus to an app heading when opened from the Dashboard", async () => {
    const user = userEvent.setup();
    const props = deskProps(makeView());
    const rendered = render(
      <OsSessionProvider>
        <DeskOs {...props} phase="desk_login" />
      </OsSessionProvider>,
    );
    rendered.rerender(
      <OsSessionProvider>
        <DeskOs {...props} phase="seated_monitor" />
      </OsSessionProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /Tickets Case notes/i }),
    );

    expect(screen.getByRole("heading", { name: "Tickets" })).toHaveFocus();
  });

  it("scopes selected events and artifacts per system and moves focus semantically", async () => {
    const user = userEvent.setup();
    const base = makeView();
    const view = makeView({
      events: [
        first(base.events),
        { ...first(base.events), id: "alert-2", title: "Second alert" },
        {
          ...first(base.events),
          id: "email-1",
          title: "Handoff email",
          systemId: "email",
        },
      ],
      artifacts: [
        first(base.artifacts),
        {
          ...first(base.artifacts),
          id: "artifact-alert-1b",
          title: "Alert A-1042 timeline",
        },
        {
          ...first(base.artifacts),
          id: "artifact-alert-2",
          title: "Alert A-2048",
          eventIds: ["alert-2"],
        },
        {
          ...first(base.artifacts),
          id: "artifact-email-1",
          systemId: "email",
          kind: "email",
          title: "Night shift handoff",
          eventIds: ["email-1"],
        },
      ],
    });
    render(
      <OsSessionProvider>
        <DeskOs {...deskProps(view)} />
      </OsSessionProvider>,
    );
    await user.click(screen.getByRole("tab", { name: /^Alerts/ }));
    await user.click(
      within(screen.getByLabelText("Alerts items")).getByRole("button", {
        name: /Second alert/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /Alert A-2048/i }));
    expect(screen.getByRole("heading", { name: "Alert A-2048" })).toHaveFocus();

    await user.click(screen.getByRole("tab", { name: "Email" }));
    expect(
      screen.getByRole("heading", { name: "Handoff email" }),
    ).toHaveFocus();
    await user.click(
      screen.getByRole("button", { name: /Night shift handoff/i }),
    );

    await user.click(screen.getByRole("tab", { name: /^Alerts/ }));
    expect(screen.getByRole("heading", { name: "Second alert" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Alert A-2048" })).toBeVisible();
  });

  it("renders every task-bearing action as a task instead of an ordinary button", () => {
    const first = makeTask();
    const second = makeTask({
      id: "decision-task",
      actionId: "dismiss_alert",
      title: "Make the alert decision",
    });
    const utility = makeTask({
      id: "notebook-task",
      actionId: "update_notebook",
      title: "Record the case note",
    });
    const view = makeView({ tasks: [first, second, utility] });
    render(
      <SystemToolPanel
        actions={[
          { ...reviewAction, label: "Review action", taskId: first.id },
          {
            ...reviewAction,
            id: "dismiss_alert",
            label: "Decision action",
            taskId: second.id,
          },
          {
            ...reviewAction,
            id: "update_notebook",
            label: "Notebook action",
            taskId: utility.id,
          },
        ]}
        onAction={() => undefined}
        selectedEventId="alert-1"
        systemId="alert_dashboard"
        view={view}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Review the alert evidence" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Make the alert decision" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Record the case note" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /Review action/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Decision action/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Notebook action/i }),
    ).toBeNull();
  });

  it("offers one workstation expansion control with the consolidated label", async () => {
    const user = userEvent.setup();
    const onOsFullscreen = vi.fn();
    render(
      <OsSessionProvider>
        <DeskOs {...deskProps(makeView())} onOsFullscreen={onOsFullscreen} />
      </OsSessionProvider>,
    );

    const controls = screen.getAllByRole("button", {
      name: "Expand workstation",
    });
    expect(controls).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: /Maximize|Fill screen/i }),
    ).toBeNull();
    await user.click(first(controls));
    expect(onOsFullscreen).toHaveBeenCalledTimes(1);
  });
});
