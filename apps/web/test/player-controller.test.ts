// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera } from "three";
import { PlayerController } from "../src/world/PlayerController.js";

const harness = vi.hoisted(() => ({
  frames: [] as Array<(state: unknown, dt: number) => void>,
  cleanups: [] as Array<() => void>,
  invalidates: 0,
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
  invalidate: () => {
    harness.invalidates += 1;
  },
}));
afterEach(() => {
  harness.cleanups.forEach((cleanup) => {
    cleanup();
  });
  harness.cleanups = [];
  harness.frames = [];
  harness.invalidates = 0;
});
function setup(props: Partial<Parameters<typeof PlayerController>[0]> = {}) {
  const camera = new PerspectiveCamera();
  harness.scene = {
    camera,
    gl: { domElement: document.createElement("canvas") },
  };
  PlayerController({
    colliders: [],
    enabled: true,
    onPosition: () => undefined,
    ...props,
  });
  return camera;
}
function tick() {
  for (let i = 0; i < 60; i++) harness.frames[0]?.({}, 1 / 60);
}
describe("office movement", () => {
  it("clears held movement on fullscreen exit and re-entry, then accepts fresh input", () => {
    const distance = vi.fn();
    const camera = setup({ onAcceptedDistance: distance });
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    tick();
    expect(camera.position.z).toBeLessThan(2);
    document.dispatchEvent(new Event("fullscreenchange"));
    distance.mockClear();
    // The next render removes the cosmetic walking bob without moving the player.
    harness.frames[0]?.({}, 0);
    const stopped = camera.position.clone();
    tick();
    expect(camera.position.x).toBe(stopped.x);
    expect(camera.position.z).toBe(stopped.z);
    expect(distance).not.toHaveBeenCalled();
    document.dispatchEvent(new Event("fullscreenchange"));
    tick();
    expect(camera.position.x).toBe(stopped.x);
    expect(camera.position.z).toBe(stopped.z);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
    tick();
    expect(camera.position.x).toBeGreaterThan(2.5);
    expect(distance).toHaveBeenCalled();
  });

  it("accepts WASD and arrows after a HUD button click without stealing button activation", () => {
    const camera = setup();
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();
    button.dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyW", bubbles: true }),
    );
    tick();
    expect(camera.position.z).toBeLessThan(2);
    button.dispatchEvent(
      new KeyboardEvent("keyup", { code: "KeyW", bubbles: true }),
    );
    const arrow = new KeyboardEvent("keydown", {
      code: "ArrowRight",
      bubbles: true,
      cancelable: true,
    });
    button.dispatchEvent(arrow);
    tick();
    expect(camera.position.x).toBeGreaterThan(2.5);
    expect(arrow.defaultPrevented).toBe(true);
    button.remove();
  });

  it("keeps movement keys inert while editing a HUD form field", () => {
    const camera = setup();
    const input = document.createElement("input");
    document.body.append(input);
    input.dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyW", bubbles: true }),
    );
    tick();
    expect(camera.position.z).toBe(4.2);
    input.remove();
  });

  it("reports actual accepted displacement, not blocked effort, bobbing or idle time", () => {
    let meters = 0;
    const onPosition = vi.fn();
    setup({
      onPosition,
      onAcceptedDistance: (distance) => {
        meters += distance;
      },
      colliders: [{ minX: 1, maxX: 2, minZ: -6, maxZ: 6 }],
    });
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
    tick();
    const end = onPosition.mock.lastCall?.[0] as
      | [number, number, number]
      | undefined;
    expect(meters).toBeCloseTo(end?.[0] ?? -1);
    expect(meters).toBeLessThan(1);
    const accepted = meters;
    tick();
    expect(meters).toBe(accepted);
    window.dispatchEvent(new Event("blur"));
    tick();
    expect(meters).toBe(accepted);
  });
  it("does not count aisle recovery or seated camera animation as walking", () => {
    const onAcceptedDistance = vi.fn();
    const onRecover = vi.fn();
    setup({ seated: true, onAcceptedDistance, onRecover });
    tick();
    window.dispatchEvent(new Event("soc-recover-aisle"));
    tick();
    expect(onRecover).toHaveBeenCalledOnce();
    expect(onAcceptedDistance).not.toHaveBeenCalled();
  });
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
  it("stops invalidating once the seated pose settles", () => {
    setup({ seated: true });
    tick();
    tick();
    expect(harness.invalidates).toBeGreaterThan(0);
    const settled = harness.invalidates;
    tick();
    expect(harness.invalidates).toBe(settled);
  });
});
