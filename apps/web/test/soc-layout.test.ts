import { describe, expect, it } from "vitest";
import { nearestHotspot } from "../src/world/Hotspot.js";
import { BREAK_NOOK } from "../src/world/rooms/GlassBreakNook.js";
import {
  BASE_HOTSPOTS,
  BREAK_INTERIOR_HOTSPOTS,
  CLAMP,
  cubicleCollider,
  INNER,
  isStandable,
  PLAYER_DESK,
  PLAYER_RADIUS,
  PLAYER_SPAWN,
  socColliders,
} from "../src/world/rooms/socLayout.js";

const STEP = 0.1;

/** Every position the player can occupy, on a 10cm grid. */
function standablePoints(doorOpen: boolean): [number, number][] {
  const boxes = socColliders(doorOpen);
  const points: [number, number][] = [];
  for (let x = -CLAMP.x; x <= CLAMP.x; x += STEP) {
    for (let z = -CLAMP.z; z <= CLAMP.z; z += STEP) {
      if (isStandable(x, z, boxes)) points.push([x, z]);
    }
  }
  return points;
}

/** Flood fill from spawn to find everywhere the player can actually walk to. */
function reachableFromSpawn(doorOpen: boolean): Set<string> {
  const boxes = socColliders(doorOpen);
  const key = (x: number, z: number) =>
    `${Math.round(x / STEP).toString()}:${Math.round(z / STEP).toString()}`;
  const start: [number, number] = [PLAYER_SPAWN[0], PLAYER_SPAWN[2]];
  const seen = new Set<string>([key(...start)]);
  const queue: [number, number][] = [start];

  for (let head = 0; head < queue.length; head += 1) {
    const [x, z] = queue[head] ?? [0, 0];
    for (const [dx, dz] of [
      [STEP, 0],
      [-STEP, 0],
      [0, STEP],
      [0, -STEP],
    ] as const) {
      const nx = x + dx;
      const nz = z + dz;
      if (Math.abs(nx) > CLAMP.x || Math.abs(nz) > CLAMP.z) continue;
      const k = key(nx, nz);
      if (seen.has(k)) continue;
      if (!isStandable(nx, nz, boxes)) continue;
      seen.add(k);
      queue.push([nx, nz]);
    }
  }
  return seen;
}

const openReachable = reachableFromSpawn(true);
const closedReachable = reachableFromSpawn(false);
const openPoints = standablePoints(true);

function reachablePointsWithin(
  hotspot: (typeof BASE_HOTSPOTS)[number],
  reachable: Set<string>,
): [number, number][] {
  const key = (x: number, z: number) =>
    `${Math.round(x / STEP).toString()}:${Math.round(z / STEP).toString()}`;
  return openPoints.filter(([x, z]) => {
    if (!reachable.has(key(x, z))) return false;
    return (
      Math.hypot(x - hotspot.position[0], z - hotspot.position[2]) <=
      hotspot.radius
    );
  });
}

describe("SOC layout reachability", () => {
  it("keeps finite resources in the break room", () => {
    const baseIds: readonly string[] = BASE_HOTSPOTS.map(({ id }) => id);
    expect(baseIds).not.toContain("snack");
    expect(BREAK_INTERIOR_HOTSPOTS.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["fridge", "coffee", "jules"]),
    );
  });

  it("spawns the player somewhere legal", () => {
    expect(
      isStandable(PLAYER_SPAWN[0], PLAYER_SPAWN[2], socColliders(false)),
    ).toBe(true);
  });

  it.each(BASE_HOTSPOTS.map((h) => [h.id, h] as const))(
    "lets the player walk to %s",
    (_id, hotspot) => {
      const spots = reachablePointsWithin(hotspot, closedReachable);
      expect(spots.length).toBeGreaterThan(0);
    },
  );

  it.each(BREAK_INTERIOR_HOTSPOTS.map((h) => [h.id, h] as const))(
    "lets the player walk to %s once the break door is open",
    (_id, hotspot) => {
      const spots = reachablePointsWithin(hotspot, openReachable);
      expect(spots.length).toBeGreaterThan(0);
    },
  );

  it("only reaches the break room interior when the door is open", () => {
    const inside = (reachable: Set<string>) =>
      [...reachable].some((k) => {
        const [gx, gz] = k.split(":").map(Number) as [number, number];
        const x = gx * STEP;
        const z = gz * STEP;
        return (
          x > BREAK_NOOK.cornerX + 0.2 &&
          z < BREAK_NOOK.cornerZ - 0.2 &&
          z > BREAK_NOOK.wallZ
        );
      });

    expect(inside(openReachable)).toBe(true);
    expect(inside(closedReachable)).toBe(false);
  });

  it("clamps the player capsule clear of every wall face", () => {
    expect(CLAMP.x + PLAYER_RADIUS).toBeLessThan(INNER.maxX);
    expect(-CLAMP.x - PLAYER_RADIUS).toBeGreaterThan(INNER.minX);
    expect(CLAMP.z + PLAYER_RADIUS).toBeLessThan(INNER.maxZ);
    expect(-CLAMP.z - PLAYER_RADIUS).toBeGreaterThan(INNER.minZ);
  });

  it("keeps a walkable lane between the player cubicle and the break glass", () => {
    const cubicle = cubicleCollider(PLAYER_DESK);
    const laneMin = cubicle.maxX + PLAYER_RADIUS;
    const laneMax = BREAK_NOOK.cornerX - 0.08 - PLAYER_RADIUS;

    expect(laneMax - laneMin).toBeGreaterThan(0.6);
  });

  it("never lets the player stand inside a cubicle", () => {
    const boxes = socColliders(true);
    for (const origin of [PLAYER_DESK]) {
      const cubicle = cubicleCollider(origin);
      const midX = (cubicle.minX + cubicle.maxX) / 2;
      const midZ = (cubicle.minZ + cubicle.maxZ) / 2;
      expect(isStandable(midX, midZ, boxes)).toBe(false);
    }
  });

  it("still detects the chair from the closest legal standing spot", () => {
    const desk = BASE_HOTSPOTS.find((h) => h.id === "desk_player");
    if (!desk) throw new Error("desk_player hotspot missing");
    const spots = reachablePointsWithin(desk, closedReachable);
    const closest = spots.reduce(
      (best, [x, z]) => {
        const d = Math.hypot(x - desk.position[0], z - desk.position[2]);
        return d < best.d ? { d, x, z } : best;
      },
      { d: Number.POSITIVE_INFINITY, x: 0, z: 0 },
    );

    expect(closest.d).toBeLessThan(0.6);
    expect(nearestHotspot([closest.x, 1.6, closest.z], BASE_HOTSPOTS)?.id).toBe(
      "desk_player",
    );
  });
});
