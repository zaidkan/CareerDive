// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useEffect, useRef } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { SpatialShell } from "../src/world/SpatialShell.js";
import { OpsConsole } from "../src/world/deskOs/OpsConsole.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";

const probes = vi.hoisted(() => ({ mounts: vi.fn(), tool: vi.fn() }));
vi.mock("../src/world/FloorMap.js", () => ({
  FloorMap: ({
    onRequestFullscreen,
    onEnterRoom,
  }: {
    onRequestFullscreen: () => void;
    onEnterRoom: (id: "soc") => void;
  }) => (
    <button
      onClick={() => {
        onRequestFullscreen();
        window.setTimeout(() => { onEnterRoom("soc"); }, 30);
      }}
    >
      Enter room
    </button>
  ),
}));
vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: ({
    active,
    onInteract,
  }: {
    active: boolean;
    onInteract: (id: "door_exit") => void;
  }) => {
    useEffect(() => {
      probes.mounts();
    }, []);
    const retained = useRef(0);
    return (
      <div data-testid="scene" data-active={String(active)}>
        <button
          onClick={() => {
            retained.current++;
            onInteract("door_exit");
          }}
        >
          Exit room
        </button>
        <span>{retained.current}</span>
      </div>
    );
  },
}));
vi.mock("../src/world/deskOs/SystemApp.js", () => ({
  SystemApp: ({ view }: { view: { simClock: number } }) => {
    probes.tool();
    return <div data-testid="tool-clock">{view.simClock}</div>;
  },
}));
vi.mock("../src/world/deskOs/CaseWorkspace.js", () => ({
  CaseWorkspace: ({ view }: { view: { simClock: number } }) => {
    probes.tool();
    return <div data-testid="tool-clock">{view.simClock}</div>;
  },
}));
function fresh() {
  return toClientView(
    createInitialWorldState(
      "runtime-performance",
      7,
      {},
      loadDefaultCybersecurityPack(),
    ),
  );
}
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it("defers scene creation until entry, then retains it while pausing on map return", async () => {
  const requestFullscreen = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
    configurable: true,
    value: requestFullscreen,
  });
  const view = fresh();
  const onAction = vi.fn();
  render(<SpatialShell view={view} onAction={onAction} />);
  expect(screen.queryByTestId("scene")).toBeNull();
  expect(probes.mounts).not.toHaveBeenCalled();
  // The fullscreen target exists before the lazy renderer; request remains
  // synchronous with room selection rather than waiting for asset loading.
  fireEvent.click(screen.getByRole("button", { name: "Enter room" }));
  expect(requestFullscreen).toHaveBeenCalledOnce();
  await waitFor(() =>
    { expect(screen.getByTestId("scene")).toHaveAttribute("data-active", "true"); },
  );
  expect(probes.mounts).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Exit room" }));
  // Exiting the room now exits fullscreen before returning to the map, so the
  // leave_room transition resolves asynchronously. The scene stays mounted
  // (retained) but pauses once the floor map is shown.
  await waitFor(() =>
    { expect(screen.getByTestId("scene")).toHaveAttribute("data-active", "false"); },
  );
  expect(screen.getByTestId("scene")).toHaveTextContent("1");
  fireEvent.click(screen.getByRole("button", { name: "Enter room" }));
  await waitFor(() =>
    { expect(screen.getByTestId("scene")).toHaveAttribute("data-active", "true"); },
  );
  expect(probes.mounts).toHaveBeenCalledOnce();
  expect(onAction).not.toHaveBeenCalled();
  delete (HTMLElement.prototype as unknown as Record<string, unknown>)
    .requestFullscreen;
});

it("skips unchanged workstation renders but propagates canonical and navigation changes", async () => {
  const view = fresh();
  view.events = view.events.filter(({ id }) => id !== "handoff-1");
  const onAction = vi.fn();
  const tree = (current = view) => (
    <OsSessionProvider>
      <OpsConsole view={current} onAction={onAction} />
    </OsSessionProvider>
  );
  const { rerender } = render(tree());
  await screen.findByTestId("tool-clock");
  const before = probes.tool.mock.calls.length;
  rerender(tree());
  expect(probes.tool).toHaveBeenCalledTimes(before);
  rerender(tree({ ...view, simClock: view.simClock + 1 }));
  expect(screen.getByTestId("tool-clock")).toHaveTextContent(
    String(view.simClock + 1),
  );
  expect(probes.tool.mock.calls.length).toBeGreaterThan(before);
  const afterState = probes.tool.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Guides" }));
  expect(screen.getByRole("button", { name: "Guides" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(probes.tool.mock.calls.length).toBeGreaterThan(afterState);
});
