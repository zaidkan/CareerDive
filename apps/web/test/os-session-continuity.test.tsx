// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import {
  OsSessionProvider,
  useOsSession,
  type OsSessionState,
} from "../src/world/deskOs/osSession.js";
import { DESK_LOGIN } from "../src/world/deskLogin.js";
import {
  INITIAL_SPATIAL,
  reduceSpatialEvent,
  type SpatialEvent,
} from "../src/world/presentation.js";

afterEach(cleanup);

const view: ClientView = {
  sessionId: "session-1",
  sessionKind: "assessed",
  simClock: 42,
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
};

function Journey({
  capture,
  onLogin,
  onAction,
  onTaskAttempt,
  onNotification,
  onWorkplaceInteraction,
}: {
  capture: { current: OsSessionState | null };
  onLogin: ReturnType<typeof vi.fn>;
  onAction: ReturnType<typeof vi.fn>;
  onTaskAttempt: ReturnType<typeof vi.fn>;
  onNotification: ReturnType<typeof vi.fn>;
  onWorkplaceInteraction: ReturnType<typeof vi.fn>;
}) {
  const [spatial, setSpatial] = useState(INITIAL_SPATIAL);
  const { state, dispatch } = useOsSession();
  capture.current = state;
  const send = (event: SpatialEvent) => {
    setSpatial((current) => reduceSpatialEvent(current, event));
  };
  if (spatial.phase === "floor_map") {
    return (
      <button
        onClick={() => {
          send({ type: "enter_room", roomId: "soc" });
        }}
        type="button"
      >
        Enter workplace
      </button>
    );
  }
  if (spatial.phase === "room_walk") {
    return (
      <>
        <button
          onClick={() => {
            send({ type: "sit_desk" });
          }}
          type="button"
        >
          Sit at computer
        </button>
        <button
          onClick={() => {
            send({ type: "leave_room" });
          }}
          type="button"
        >
          Leave workplace
        </button>
      </>
    );
  }
  return (
    <DeskOs
      phase={spatial.phase}
      view={view}
      onAction={onAction}
      onTaskAttempt={onTaskAttempt}
      onNotification={onNotification}
      onWorkplaceInteraction={onWorkplaceInteraction}
      onLoginSuccess={() => {
        onLogin();
        send({ type: "login_success" });
        dispatch({ type: "mark_morgan_intro_seen" });
      }}
      onStand={() => {
        send({ type: "stand" });
      }}
      onOsFullscreen={() => undefined}
    />
  );
}

it("restores the authenticated tool, case, and scratchpad after stand, leave, return, and sit", async () => {
  const user = userEvent.setup();
  const capture: { current: OsSessionState | null } = { current: null };
  const onLogin = vi.fn(),
    onAction = vi.fn(),
    onTaskAttempt = vi.fn(),
    onNotification = vi.fn(),
    onWorkplaceInteraction = vi.fn();
  render(
    <OsSessionProvider>
      <Journey
        capture={capture}
        onLogin={onLogin}
        onAction={onAction}
        onTaskAttempt={onTaskAttempt}
        onNotification={onNotification}
        onWorkplaceInteraction={onWorkplaceInteraction}
      />
    </OsSessionProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Enter workplace" }));
  await user.click(screen.getByRole("button", { name: "Sit at computer" }));
  expect(screen.getByTestId("login-curtain")).toBeVisible();
  await user.click(screen.getByTestId("login-surface"));
  expect(
    screen.getByRole("heading", { name: "Sign in to Verdaly" }),
  ).toBeVisible();
  expect(screen.getByLabelText("Username")).toHaveValue(DESK_LOGIN.username);
  await user.selectOptions(screen.getByLabelText("Password"), DESK_LOGIN.password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(
    await screen.findByRole("navigation", { name: "Workstation tools" }),
  ).toBeVisible();
  expect(onLogin).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Tickets" }));
  await user.click(screen.getByText("Personal scratchpad (optional)"));
  await user.selectOptions(
    screen.getByLabelText("Scratch notes"),
    "Check the device label",
  );
  await user.click(screen.getByRole("button", { name: "Email" }));
  const before = JSON.stringify(capture.current);
  await user.click(screen.getByRole("button", { name: "Leave desk" }));
  expect(
    screen.queryByRole("navigation", { name: "Workstation tools" }),
  ).toBeNull();
  await user.click(screen.getByRole("button", { name: "Leave workplace" }));
  await user.click(screen.getByRole("button", { name: "Enter workplace" }));
  await user.click(screen.getByRole("button", { name: "Sit at computer" }));
  expect(
    screen.queryByRole("heading", { name: "Sign in to Verdaly" }),
  ).toBeNull();
  expect(screen.getByRole("button", { name: "Email" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(JSON.stringify(capture.current)).toBe(before);
  expect(onLogin).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Tickets" }));
  await user.click(screen.getByText("Personal scratchpad (optional)"));
  expect(screen.getByLabelText("Scratch notes")).toHaveValue(
    "Check the device label",
  );
  for (const handler of [
    onAction,
    onTaskAttempt,
    onNotification,
    onWorkplaceInteraction,
  ])
    expect(handler).not.toHaveBeenCalled();
});
