// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera } from "three";
import { PlayerController } from "../src/world/PlayerController.js";

const harness = vi.hoisted(() => ({
  frames: [] as Array<(state: unknown, dt: number) => void>,
  cleanups: [] as Array<() => void>,
  scene: {},
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => (() => void) | undefined) => {
    const cleanup = effect();
    if (cleanup) harness.cleanups.push(cleanup);
  },
}));
vi.mock("@react-three/fiber", () => ({
  useThree: () => harness.scene,
  useFrame: (frame: (state: unknown, dt: number) => void) => {
    harness.frames.push(frame);
  },
}));
afterEach(() => {
  harness.cleanups.forEach((cleanup) => {
    cleanup();
  });
  harness.cleanups = [];
  harness.frames = [];
});
function setup() {
  const camera = new PerspectiveCamera();
  harness.scene = {
    camera,
    gl: { domElement: document.createElement("canvas") },
  };
  PlayerController({
    colliders: [],
    enabled: true,
    onPosition: () => undefined,
  });
  return camera;
}
function tick() {
  for (let i = 0; i < 60; i++) harness.frames[0]?.({}, 1 / 60);
}
describe("office movement", () => {
  it("uses the fast pace without Shift and keeps the horizon level while strafing", () => {
    const camera = setup();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
    tick();
    expect(camera.position.x).toBeGreaterThan(2.5);
    expect(camera.rotation.z).toBe(0);
    window.dispatchEvent(new Event("blur"));
    const stopped = camera.position.x;
    tick();
    expect(camera.position.x).toBeCloseTo(stopped);
  });
  it("does not increase movement speed when Shift is held", () => {
    const camera = setup();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    tick();
    const start = camera.position.z;
    tick();
    const normalDistance = start - camera.position.z;
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ShiftLeft" }));
    const beforeShift = camera.position.z;
    tick();
    expect(beforeShift - camera.position.z).toBeCloseTo(normalDistance, 1);
  });
});
