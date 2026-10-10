// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { RoomCanvas } from "../src/world/RoomCanvas.js";
const canvas = vi.hoisted(() => vi.fn());
vi.mock("@react-three/fiber", () => ({
  Canvas: (props: { frameloop: string }) => {
    canvas(props.frameloop);
    return null;
  },
}));
vi.mock("../src/experience/diagnostics.js", () => ({
  graphicsAvailable: () => true,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("stops hidden frames, resumes walking, and preserves demand rendering at the desk", () => {
  const workplace = toClientView(
    createInitialWorldState(
      "frame-mode",
      7,
      {},
      loadDefaultCybersecurityPack(),
    ),
  ).workplace;
  const props = {
    workplace,
    enabled: false,
    onNearbyChange: vi.fn(),
    onInteract: vi.fn(),
    onBreakRoomExit: vi.fn(),
  };
  const { rerender } = render(<RoomCanvas {...props} />);
  expect(canvas).toHaveBeenLastCalledWith("always");
  rerender(<RoomCanvas {...props} active={false} />);
  expect(canvas).toHaveBeenLastCalledWith("never");
  rerender(<RoomCanvas {...props} active seated />);
  expect(canvas).toHaveBeenLastCalledWith("demand");
  rerender(<RoomCanvas {...props} active />);
  expect(canvas).toHaveBeenLastCalledWith("always");
});
