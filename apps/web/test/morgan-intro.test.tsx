// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { createInitialWorldState, foldActionLog } from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { App } from "../src/index.js";
import { SpatialShell } from "../src/world/SpatialShell.js";
import { TeamChatTool } from "../src/components/tools/TeamChatTool.js";
import {
  createInitialOsSession,
  osSessionReducer,
} from "../src/world/deskOs/osSession.js";
import { MORGAN_INTRO_BODY } from "../src/world/deskOs/os/morganIntro.js";
import type { SimulationClient } from "../src/client.js";

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
  RoomCanvas: ({ onInteract }: { onInteract: (id: string) => void }) => (
    <button
      onClick={() => {
        onInteract("desk_player");
      }}
      type="button"
    >
      Sit at desk
    </button>
  ),
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

function makeView(overrides: Partial<ClientView> = {}): ClientView {
  return {
    sessionId: "session-1",
    sessionKind: "assessed",
    simClock: 10,
    currentLocation: {
      id: "operations-center",
      name: "Security Operations Center",
      connectedLocationIds: [],
      interactableIds: [],
    },
    events: [],
    availableActions: [],
    operationalMessages: [],
    pacingMode: "standard",
    artifacts: [],
    ticketNotes: {},
    notebook: "",
    kbQuery: "",
    tasks: [],
    notifications: [],
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
        feedback: "movement_recorded",
      }),
    submitTaskAttempt: () =>
      Promise.resolve({
        view: initialView,
        accepted: true,
        completed: true,
        feedback: "Task complete.",
      }),
    respondToNotification: () => Promise.resolve(initialView),
    getDebrief: () => Promise.reject(new Error("Not needed")),
    ...overrides,
  };
}

async function enterDesk(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole(
      "button",
      { name: "Security Operations" },
      { timeout: 6000 },
    ),
  );
  await user.click(await screen.findByRole("button", { name: "Sit at desk" }));
  await user.click(await screen.findByTestId("login-surface"));
  await user.selectOptions(await screen.findByLabelText(/^Password$/i), "FirstDay!");
  await user.click(await screen.findByRole("button", { name: /^Sign in$/i }));
  await screen.findByRole("navigation", { name: "Workstation tools" });
}

async function openTeamChat(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /^Team/ }));
}

function introNodes() {
  return screen.queryAllByTestId("morgan-intro");
}

describe("once-per-session Morgan introduction", () => {
  it("arms only on mark and stays once-only across repeated marks and a fresh session", () => {
    const first = createInitialOsSession();
    expect(first.morganIntroSeen).toBe(false);

    const armed = osSessionReducer(first, { type: "mark_morgan_intro_seen" });
    expect(armed.morganIntroSeen).toBe(true);
    expect(armed).not.toBe(first);

    const rearmed = osSessionReducer(armed, { type: "mark_morgan_intro_seen" });
    expect(rearmed).toBe(armed);
    expect(rearmed.morganIntroSeen).toBe(true);

    expect(createInitialOsSession().morganIntroSeen).toBe(false);
  });

  it("keeps replay of canonical state independent of the intro flag", () => {
    const pack = loadDefaultCybersecurityPack();
    const state = createInitialWorldState("intro-replay", 24, {}, pack);
    const initial = structuredClone(state);
    const armed = osSessionReducer(createInitialOsSession(), {
      type: "mark_morgan_intro_seen",
    });
    expect(armed.morganIntroSeen).toBe(true);
    expect(foldActionLog(initial, [])).toEqual(state);
    expect(state.observedArtifactIds).not.toContain("chat-morgan");
  });

  it("shows the intro in Team Chat after the first login only", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <SpatialShell
        view={makeView()}
        onAction={onAction}
        onNotification={() => Promise.resolve()}
        onWorkplaceInteraction={() =>
          Promise.resolve({
            view: makeView(),
            sequence: 1,
            feedback: "movement_recorded",
          })
        }
      />,
    );

    await enterDesk(user);
    await openTeamChat(user);
    expect(introNodes()).toHaveLength(1);
    expect(screen.getByTestId("morgan-intro")).toHaveTextContent(
      MORGAN_INTRO_BODY,
    );
    expect(onAction).not.toHaveBeenCalled();
  });

  it("does not show the intro before a successful login", async () => {
    const user = userEvent.setup();
    render(<SpatialShell view={makeView()} onAction={vi.fn()} />);
    await user.click(
      await screen.findByRole(
        "button",
        { name: "Security Operations" },
        { timeout: 6000 },
      ),
    );
    await user.click(await screen.findByRole("button", { name: "Sit at desk" }));
    await user.click(await screen.findByTestId("login-surface"));
    expect(await screen.findByRole("heading", { name: /Sign in/i })).toBeVisible();
    expect(introNodes()).toHaveLength(0);
  });

  it("does not duplicate the intro across leave/return, app switching, or Team Chat reopen", async () => {
    const user = userEvent.setup();
    render(<SpatialShell view={makeView()} onAction={vi.fn()} />);

    await enterDesk(user);
    await openTeamChat(user);
    expect(introNodes()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Alerts" }));
    await user.click(screen.getByRole("button", { name: "Tickets" }));
    await user.click(screen.getByRole("button", { name: "Alerts" }));
    await openTeamChat(user);
    expect(introNodes()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Leave desk" }));
    await user.click(
      await screen.findByRole("button", { name: "Sit at desk" }, { timeout: 6000 }),
    );
    expect(screen.queryByRole("heading", { name: /Sign in/i })).toBeNull();
    expect(await screen.findByRole("button", { name: /^Team/ })).toHaveAttribute("aria-current", "page");
    await openTeamChat(user);
    expect(introNodes()).toHaveLength(1);
    expect(screen.getByTestId("morgan-intro")).toHaveTextContent(
      MORGAN_INTRO_BODY,
    );
  });

  it("keeps a fresh provider session able to show the intro again for a new simulation session", async () => {
    const user = userEvent.setup();
    const first = render(<SpatialShell view={makeView()} onAction={vi.fn()} />);
    await enterDesk(user);
    await openTeamChat(user);
    expect(introNodes()).toHaveLength(1);
    first.unmount();

    render(<SpatialShell view={makeView({ sessionId: "second-session" })} onAction={vi.fn()} />);
    await enterDesk(user);
    await openTeamChat(user);
    expect(introNodes()).toHaveLength(1);
  });

  it("creates exactly one simulation session and never opens practice or tutorial architecture", async () => {
    const user = userEvent.setup();
    const view = makeView();
    const createSession = vi.fn().mockResolvedValue({
      sessionId: view.sessionId,
      view,
    });
    const respondToNotification = vi.fn();
    render(
      <App
        client={makeClient(view, { createSession, respondToNotification })}
      />,
    );
    await enterDesk(user);
    await openTeamChat(user);

    expect(introNodes()).toHaveLength(1);
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(respondToNotification).not.toHaveBeenCalled();
    expect(
      screen.queryByText(
        /Skip practice|Practice shift|Walk the office|Desk only|Simple list|Choose how/i,
      ),
    ).toBeNull();
    expect(screen.queryByRole("navigation", { name: /Choose how/i })).toBeNull();
  });

  it("renders no intro in Team Chat when the session flag is unset", () => {
    render(<TeamChatTool view={makeView()} />);
    expect(screen.queryByTestId("morgan-intro")).toBeNull();
    expect(
      screen.getByRole("article", { name: "Morgan message thread" }),
    ).toBeInTheDocument();
  });

  it("keeps the intro readable as a single node inside the Morgan thread", async () => {
    const user = userEvent.setup();
    render(<SpatialShell view={makeView()} onAction={vi.fn()} />);
    await enterDesk(user);
    await openTeamChat(user);

    const thread = screen.getByRole("article", {
      name: "Morgan message thread",
    });
    const intros = within(thread).getAllByTestId("morgan-intro");
    expect(intros).toHaveLength(1);
    await waitFor(() => {
      expect(intros[0]).toBeVisible();
    });
  });
});
