// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { GraphicsDiagnostics } from "../src/world/diagnostics/GraphicsDiagnostics.js";

const harness = vi.hoisted(() => ({
  frame: (state: unknown, delta: number) => {
    void state;
    void delta;
  },
  info: {
    autoReset: true,
    render: { calls: 100, triangles: 1000 },
    memory: { geometries: 10, textures: 5 },
    reset: vi.fn(),
  },
}));
vi.mock("@react-three/fiber", () => ({
  useThree: (select: (state: unknown) => unknown) =>
    select({ gl: { info: harness.info } }),
  useFrame: (frame: typeof harness.frame, priority: number) => {
    expect(priority).toBeLessThan(0);
    harness.frame = frame;
  },
}));
vi.mock("@react-three/drei", () => ({ Html: "div" }));
vi.mock("../src/world/effects/useAdaptiveQuality.js", () => ({
  useWorldQuality: () => ({ dpr: 1, composer: true }),
}));

it("restores renderer auto-reset and removes visibility listeners when unmounted", () => {
  const add = vi.spyOn(document, "addEventListener");
  const remove = vi.spyOn(document, "removeEventListener");
  const { unmount } = renderHook(() => GraphicsDiagnostics({ seated: false }));
  expect(harness.info.autoReset).toBe(false);
  const listener = add.mock.calls.find(
    ([event]) => event === "visibilitychange",
  )?.[1];
  act(() => {
    harness.frame({}, 1 / 60);
  });
  expect(harness.info.reset).toHaveBeenCalled();
  unmount();
  expect(harness.info.autoReset).toBe(true);
  expect(remove).toHaveBeenCalledWith("visibilitychange", listener);
  vi.restoreAllMocks();
});
