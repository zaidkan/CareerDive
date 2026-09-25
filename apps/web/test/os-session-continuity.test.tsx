// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import { OsSessionProvider, useOsSession, type OsSessionState } from "../src/world/deskOs/osSession.js";
import { DESK_LOGIN } from "../src/world/deskLogin.js";
import { INITIAL_SPATIAL, reduceSpatialEvent, type SpatialEvent } from "../src/world/presentation.js";

afterEach(cleanup);

const view: ClientView = {
  sessionId: "session-1", sessionKind: "assessed", simClock: 42,
  currentLocation: { id: "operations-center", name: "Security Operations Center", connectedLocationIds: [], interactableIds: [] },
  events: [], availableActions: [], operationalMessages: [], pacingMode: "standard",
  artifacts: [], ticketNotes: {}, notebook: "", kbQuery: "", tasks: [], notifications: [], queryResults: [],
  workplace: {
    energy: { current: 80, max: 100 }, carriedSnackBites: 0, fridgeSnackBars: 2,
    fridgeOpen: false, coffeeServings: 2, coffeeStage: "idle", julesTopicsSeen: [], emergencyRecoveryUsed: false,
  },
};

function Journey({
  capture, onLogin, onAction, onTaskAttempt, onNotification, onWorkplaceInteraction,
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
  const send = (event: SpatialEvent) => { setSpatial((current) => reduceSpatialEvent(current, event)); };
  if (spatial.phase === "floor_map") {
    return <button onClick={() => { send({ type: "enter_room", roomId: "soc" }); }} type="button">Enter workplace</button>;
  }
  if (spatial.phase === "room_walk") {
    return <>
      <button onClick={() => { send({ type: "sit_desk" }); }} type="button">Sit at computer</button>
      <button onClick={() => { send({ type: "leave_room" }); }} type="button">Leave workplace</button>
    </>;
  }
  return <DeskOs
    phase={spatial.phase} view={view} onAction={onAction}
    onTaskAttempt={onTaskAttempt} onNotification={onNotification}
    onWorkplaceInteraction={onWorkplaceInteraction}
    onLoginSuccess={() => {
      onLogin();
      send({ type: "login_success" });
      dispatch({ type: "mark_morgan_intro_seen" });
    }}
    onStand={() => { send({ type: "stand" }); }}
    onOsFullscreen={() => undefined}
  />;
}

it("restores the full authenticated workstation after stand, leave, return, and sit", async () => {
  const user = userEvent.setup();
  const capture: { current: OsSessionState | null } = { current: null };
  const onLogin = vi.fn();
  const onAction = vi.fn();
  const onTaskAttempt = vi.fn();
  const onNotification = vi.fn();
  const onWorkplaceInteraction = vi.fn();
  const { container } = render(
    <OsSessionProvider>
      <Journey capture={capture} onLogin={onLogin} onAction={onAction}
        onTaskAttempt={onTaskAttempt} onNotification={onNotification}
        onWorkplaceInteraction={onWorkplaceInteraction} />
    </OsSessionProvider>,
  );
  const frame = (id: string) => {
    const element = container.querySelector<HTMLElement>(`[data-window-id="${id}"]`);
    if (!element) throw new Error(`Window ${id} missing`);
    return element;
  };
  const pinned = (name: string) => within(screen.getByRole("group", { name: "Pinned apps" })).getByRole("button", { name });
  const taskbar = (name: string) => within(screen.getByRole("group", { name: "Open windows" })).getByRole("button", { name });
  const drag = (id: string, dx: number, dy: number) => {
    const bar = frame(id).querySelector<HTMLElement>(".os-window-bar");
    if (!bar) throw new Error("Window title bar missing");
    for (const [type, x, y] of [["pointerdown", 100, 100], ["pointermove", 100 + dx, 100 + dy], ["pointerup", 100 + dx, 100 + dy]] as const) {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
      Object.defineProperty(event, "pointerId", { value: 1 });
      fireEvent(bar, event);
    }
  };

  await user.click(screen.getByRole("button", { name: "Enter workplace" }));
  await user.click(screen.getByRole("button", { name: "Sit at computer" }));
  expect(screen.getByRole("heading", { name: "Sign in to Verdaly" })).toBeVisible();
  await user.type(screen.getByLabelText("Username"), DESK_LOGIN.username);
  await user.type(screen.getByLabelText("Password"), DESK_LOGIN.password);
  await user.click(screen.getByRole("button", { name: "Login" }));
  expect(await screen.findByRole("toolbar", { name: "Taskbar" })).toBeVisible();
  expect(onLogin).toHaveBeenCalledTimes(1);

  await user.click(within(frame("window-1")).getByRole("tab", { name: "Email" }));
  await user.click(within(frame("window-1")).getByRole("button", { name: "Restore Browser" }));
  drag("window-1", 50, 35);
  expect(frame("window-1").style.left).toBe("74px");
  await user.click(within(frame("window-1")).getByRole("button", { name: "Maximize Browser" }));
  await user.click(within(frame("window-1")).getByRole("button", { name: "Minimize Browser" }));
  await user.click(screen.getByRole("button", { name: "Open Browser" }));
  await user.click(within(frame("window-2")).getByRole("button", { name: "Company intranet" }));

  await user.click(pinned("Files"));
  drag("window-3", 40, 25);
  const files = within(frame("window-3"));
  await user.click(files.getByRole("button", { name: /shift-brief\.txt/ }));
  await user.click(files.getByRole("button", { name: "Cut" }));
  await user.click(files.getByRole("button", { name: /^Downloads/ }));
  await user.click(files.getByRole("button", { name: "Paste here" }));
  await user.click(files.getByRole("button", { name: /shift-brief\.txt/ }));
  await user.click(files.getByRole("button", { name: "Minimize Files" }));

  await user.click(pinned("Notes"));
  await user.type(within(frame("window-4")).getByLabelText("Scratch notes"), "carry open items");
  const before = structuredClone(capture.current);
  expect(before?.windows.windows).toHaveLength(4);
  expect(before?.windows.focusedWindowId).toBe("window-4");
  expect(before?.windows.windows.find((window) => window.id === "window-1")).toMatchObject({ minimized: true, maximized: true, bounds: { x: 74, y: 55 } });
  expect(before?.windows.windows.find((window) => window.id === "window-3")).toMatchObject({ minimized: true, bounds: { x: 128, y: 109 } });
  expect(before?.morganIntroSeen).toBe(true);

  await user.click(screen.getByRole("button", { name: "Leave desk" }));
  expect(screen.queryByRole("toolbar", { name: "Taskbar" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Leave workplace" }));
  await user.click(screen.getByRole("button", { name: "Enter workplace" }));
  await user.click(screen.getByRole("button", { name: "Sit at computer" }));

  expect(screen.queryByRole("heading", { name: "Sign in to Verdaly" })).toBeNull();
  expect(screen.getByRole("toolbar", { name: "Taskbar" })).toBeVisible();
  expect(capture.current).toEqual(before);
  expect(container.querySelector('[data-window-id="window-1"]')).toBeNull();
  expect(container.querySelector('[data-window-id="window-3"]')).toBeNull();
  expect(within(frame("window-2")).getByLabelText("Address bar")).toHaveValue("verdaly://intranet");
  expect(within(frame("window-4")).getByLabelText("Scratch notes")).toHaveValue("carry open items");
  expect(onLogin).toHaveBeenCalledTimes(1);

  await user.click(taskbar("Browser, minimized"));
  expect(frame("window-1")).toHaveAttribute("data-maximized", "true");
  expect(within(frame("window-1")).getByRole("tab", { name: "Email" })).toHaveAttribute("aria-selected", "true");
  expect(within(frame("window-2")).getByLabelText("Address bar")).toHaveValue("verdaly://intranet");
  await user.click(taskbar("Files, minimized"));
  expect(within(frame("window-3")).getByRole("list", { name: "Files in Downloads" })).toHaveTextContent("shift-brief.txt");
  expect(within(frame("window-3")).getByRole("button", { name: /shift-brief\.txt/ })).toHaveAttribute("aria-pressed", "true");
  expect(onAction).not.toHaveBeenCalled();
  expect(onTaskAttempt).not.toHaveBeenCalled();
  expect(onNotification).not.toHaveBeenCalled();
  expect(onWorkplaceInteraction).not.toHaveBeenCalled();
});
