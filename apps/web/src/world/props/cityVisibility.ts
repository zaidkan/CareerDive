import {
  Box3,
  Frustum,
  Matrix4,
  Vector3,
  type Camera,
  type Scene,
  type Group,
} from "three";
import { GLAZING, ROOM } from "../rooms/socLayout.js";

// Oversized apertures intentionally tolerate frames, glazing thickness and
// grazing angles. Include the open exit: sky can also be seen through it.
const PAD = 0.5;
const APERTURES = [
  new Box3(
    new Vector3(GLAZING.north.minX - PAD, -PAD, -ROOM.halfZ - PAD),
    new Vector3(GLAZING.north.maxX + PAD, 4, -ROOM.halfZ + PAD),
  ),
  new Box3(
    new Vector3(ROOM.halfX - PAD, -PAD, GLAZING.east.minZ - PAD),
    new Vector3(ROOM.halfX + PAD, 4, GLAZING.east.maxZ + PAD),
  ),
  new Box3(
    new Vector3(-1.1 - PAD, -PAD, ROOM.halfZ - PAD),
    new Vector3(1.1 + PAD, 3, ROOM.halfZ + PAD),
  ),
];

/** Reused scratch math; no allocation or React update per rendered frame. */
export function createCityVisibilityTest(): (camera: Camera) => boolean {
  const projection = new Matrix4();
  const frustum = new Frustum();
  const position = new Vector3();
  return (camera) => {
    position.setFromMatrixPosition(camera.matrixWorld);
    // Fail open for exterior/debug cameras or a view above/below the room.
    if (
      Math.abs(position.x) >= ROOM.halfX - PAD ||
      Math.abs(position.z) >= ROOM.halfZ - PAD ||
      position.y <= 0 ||
      position.y >= 3.4
    )
      return true;
    projection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    frustum.setFromProjectionMatrix(projection);
    return APERTURES.some((aperture) => frustum.intersectsBox(aperture));
  };
}

/** Bind to actual renders, after camera motion and before scene traversal. */
export function installCityRenderGate(
  scene: Scene,
  camera: Camera,
  group: Group,
  time: { value: number },
  clock: { elapsedTime: number },
  animated: boolean,
): () => void {
  const visibleFrom = createCityVisibilityTest();
  // Preserve hook identity and invoke it with the original scene binding.
  const previous = Reflect.get(scene, "onBeforeRender");
  const beforeRender: typeof scene.onBeforeRender = (...args) => {
    previous.apply(scene, args);
    // Other passes/cameras fail open; they must not inherit the main view's
    // visibility decision (e.g. a contact-shadow capture).
    group.visible = args[2] !== camera || visibleFrom(camera);
    if (group.visible && animated && args[2] === camera)
      time.value = clock.elapsedTime;
  };
  scene.onBeforeRender = beforeRender;
  return () => {
    if (scene.onBeforeRender === beforeRender) scene.onBeforeRender = previous;
  };
}
