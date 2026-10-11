import { expect, it, vi } from "vitest";
import {
  Group,
  PerspectiveCamera,
  Scene,
  type WebGLRenderer,
} from "three";
import {
  createCityVisibilityTest,
  installCityRenderGate,
} from "../src/world/props/cityVisibility.js";

function cameraLooking(x: number, z: number, aspect = 1.4) {
  const camera = new PerspectiveCamera(62, aspect, 0.08, 1200);
  camera.position.set(0, 1.6, 4.6);
  camera.lookAt(x, 1.6, z);
  camera.updateMatrixWorld();
  return camera;
}

it("keeps glazing and doorway views, culls opaque west views, and tolerates wide screens", () => {
  const visible = createCityVisibilityTest();
  expect(visible(cameraLooking(10, -8))).toBe(true);
  expect(visible(cameraLooking(20, 0))).toBe(true);
  expect(visible(cameraLooking(0, 20))).toBe(true);
  expect(visible(cameraLooking(-20, 4.6))).toBe(false);
  expect(visible(cameraLooking(0, -20, 3))).toBe(true);
  const exterior = cameraLooking(-20, 4.6);
  exterior.position.set(20, 1.6, 0);
  exterior.updateMatrixWorld();
  expect(visible(exterior)).toBe(true);
});

it("updates visible cosmetic time only on a real render, resumes by elapsed time, and restores hooks", () => {
  const scene = new Scene();
  const camera = cameraLooking(-20, 4.6);
  const group = new Group();
  const clock = { elapsedTime: 0 };
  const time = { value: 0 };
  const previous = vi.fn();
  scene.onBeforeRender = previous;
  const cleanup = installCityRenderGate(
    scene,
    camera,
    group,
    time,
    clock,
    true,
  );
  const render = (view = camera) => {
    // WebGLRenderer invokes Scene hooks with four arguments, unlike the
    // inherited six-argument Object3D declaration in @types/three.
    Reflect.apply(Reflect.get(scene, "onBeforeRender"), scene, [{} as WebGLRenderer, scene, view, null]);
  };
  clock.elapsedTime = 2;
  expect(time.value).toBe(0); // No ambient/demand invalidation to create frames.
  render();
  expect(group.visible).toBe(false);
  expect(time.value).toBe(0);
  camera.lookAt(10, 1.6, -8);
  camera.updateMatrixWorld();
  clock.elapsedTime = 10;
  render();
  expect(group.visible).toBe(true);
  expect(time.value).toBe(10); // Same shader position as an uninterrupted city.
  render(cameraLooking(-20, 4.6));
  expect(group.visible).toBe(true); // Secondary passes must fail open.
  expect(previous).toHaveBeenCalledTimes(3);
  cleanup();
  expect(Object.getOwnPropertyDescriptor(scene, "onBeforeRender")?.value).toBe(previous);
});

it("freezes cars/clouds when LOW, seated or reduced motion disables ambient motion", () => {
  const scene = new Scene();
  const camera = cameraLooking(10, -8);
  const clock = { elapsedTime: 0 };
  clock.elapsedTime = 20;
  const time = { value: 4 };
  const cleanup = installCityRenderGate(
    scene,
    camera,
    new Group(),
    time,
    clock,
    false,
  );
  Reflect.apply(Reflect.get(scene, "onBeforeRender"), scene, [{} as WebGLRenderer, scene, camera, null]);
  expect(time.value).toBe(4);
  cleanup();
});
