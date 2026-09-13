/**
 * Movement rules shared by the walker and by the layout tests.
 *
 * These live outside PlayerController so a room can reason about where the
 * player is able to stand without restating the collision maths — a room that
 * disagreed with the controller used to be how hotspots became unreachable.
 */

export type Aabb = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

/** Player capsule radius. */
export const PLAYER_RADIUS = 0.32;

/** Hard positional bounds, kept clear of the wall faces by a capsule radius. */
export const CLAMP = { x: 10.2, z: 6.9 } as const;

export function collidesAt(
  x: number,
  z: number,
  boxes: Aabb[],
  radius = PLAYER_RADIUS,
): boolean {
  return boxes.some(
    (box) =>
      x + radius > box.minX &&
      x - radius < box.maxX &&
      z + radius > box.minZ &&
      z - radius < box.maxZ,
  );
}

/** True when the player can occupy this spot: inside the clamps and unblocked. */
export function isStandable(x: number, z: number, boxes: Aabb[]): boolean;
export function isStandable(point: { x: number; z: number }, boxes: Aabb[]): boolean;
export function isStandable(
  xOrPoint: number | { x: number; z: number },
  zOrBoxes: number | Aabb[],
  maybeBoxes?: Aabb[],
): boolean {
  const x = typeof xOrPoint === "number" ? xOrPoint : xOrPoint.x;
  const z = typeof xOrPoint === "number" ? (zOrBoxes as number) : xOrPoint.z;
  const boxes = typeof xOrPoint === "number" ? maybeBoxes ?? [] : (zOrBoxes as Aabb[]);
  if (Math.abs(x) > CLAMP.x || Math.abs(z) > CLAMP.z) return false;
  return !collidesAt(x, z, boxes);
}

export function clampToRoom(value: number, axis: "x" | "z"): number {
  const limit = CLAMP[axis];
  return Math.max(-limit, Math.min(limit, value));
}
