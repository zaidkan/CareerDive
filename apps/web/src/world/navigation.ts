import { CLAMP, isStandable, type Aabb } from "./collision.js";

export type Vec2 = { x: number; z: number };
export type SafeAnchors = Record<string, Vec2>;
export type SafeAnchorSet = SafeAnchors & { aisle: Vec2 };

/** Presentation-only destinations; these never enter the simulation log. */
export const SAFE_ANCHORS: SafeAnchorSet = {
  aisle: { x: 0, z: 4.6 },
  entrance: { x: 0, z: 6.2 },
  desk: { x: 5.6, z: 1.3 },
};

/** Find the closest legal capsule position to an arbitrary click. */
export function nearestStandableTarget(
  target: Vec2,
  colliders: Aabb[],
  anchors: SafeAnchors = SAFE_ANCHORS,
): Vec2 {
  const candidates: Vec2[] = [{
    x: Math.max(-CLAMP.x, Math.min(CLAMP.x, target.x)),
    z: Math.max(-CLAMP.z, Math.min(CLAMP.z, target.z)),
  }];
  for (let radius = 0.2; radius <= 8; radius += 0.2) {
    const count = Math.max(8, Math.ceil(radius * 12));
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      candidates.push({ x: target.x + Math.cos(angle) * radius, z: target.z + Math.sin(angle) * radius });
    }
  }
  for (const anchor of Object.values(anchors)) candidates.push(anchor);
  const legal = candidates.filter(({ x, z }) => isStandable(x, z, colliders));
  const first = legal[0] ?? SAFE_ANCHORS.aisle;
  return legal.slice(1).reduce((best, candidate) =>
    Math.hypot(candidate.x - target.x, candidate.z - target.z) < Math.hypot(best.x - target.x, best.z - target.z) ? candidate : best,
  first);
}

export function blockedWalkDetector(blockedFrames: number): { status: "moving" | "blocked" | "stuck" } {
  return { status: blockedFrames >= 20 ? "stuck" : blockedFrames > 0 ? "blocked" : "moving" };
}
