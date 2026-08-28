/**
 * Single source of truth for the SOC floor plan.
 *
 * Colliders, hotspots and prop origins all derive from these constants so a
 * furniture move cannot silently strand a hotspot behind a collider. The
 * reachability test in test/soc-layout.test.ts asserts exactly that.
 */
import type { Aabb } from "../collision.js";
import type { HotspotDef } from "../Hotspot.js";
import type { HotspotId } from "../worldTypes.js";
import { BREAK_NOOK, breakNookColliders } from "./GlassBreakNook.js";

export const ROOM = { halfX: 10.9, halfZ: 7.4 } as const;

/** Inner faces of the 0.3m-thick perimeter walls. */
export const INNER = {
  minX: -ROOM.halfX + 0.15,
  maxX: ROOM.halfX - 0.15,
  minZ: -ROOM.halfZ + 0.15,
  maxZ: ROOM.halfZ - 0.15,
} as const;

export { CLAMP, isStandable, PLAYER_RADIUS } from "../collision.js";

/**
 * East column sits far enough west to leave a walkable lane between the
 * cubicle and the break-room glass.
 */
export const COL = { west: -4.4, east: 3.8 } as const;
export const ROW = { north: -2.0, mid: 3.4, south: 6.6 } as const;
export const SEAT = 1.65;

/** Chairs face desks (−Z); seat back is local −Z so rotate π. */
export const CHAIR_FACE_DESK = Math.PI;

export const PLAYER_SPAWN: [number, number, number] = [0, 1.6, ROW.south];
export const PLAYER_DESK: [number, number, number] = [COL.east, 0, ROW.north];

/**
 * Left monitor screen center. DualMonitor sits at workstation local
 * [0, 0.8225, -0.48]; the OS pane is offset [-0.42, 0.42, 0.055].
 */
export const PLAYER_MONITOR: [number, number, number] = [
  PLAYER_DESK[0] - 0.42,
  1.2425,
  PLAYER_DESK[2] - 0.425,
];

/** Square-on seat camera, close enough that the desk and bezel stay in frame. */
export const PLAYER_SEAT_CAM: [number, number, number] = [
  PLAYER_MONITOR[0],
  PLAYER_MONITOR[1] + 0.08,
  PLAYER_MONITOR[2] + 0.95,
];
export const PLAYER_SEAT_LOOK: [number, number, number] = [
  PLAYER_MONITOR[0],
  PLAYER_MONITOR[1] - 0.02,
  PLAYER_MONITOR[2],
];
export const MORGAN_DESK: [number, number, number] = [COL.west, 0, ROW.north];
/** Empty desk opposite the player column — clear spacing. */
export const HOT_DESK: [number, number, number] = [COL.west, 0, ROW.mid];
export const SAMIR_DESK: [number, number, number] = [-10.25, 0, 0.5];
export const ALERT_POS: [number, number, number] = [COL.west, 0, -6.2];

/** Workstation cubicle: 2.95 x 2.55 fabric walls, offset +0.1 in Z. */
export const CUBICLE = { width: 2.95, depth: 2.55, offsetZ: 0.1 } as const;

/**
 * Whole cubicle footprint, not just the desk. A desk-only box left the side
 * walls uncovered in front of the desk, so the player could stride through
 * the fabric.
 */
export function cubicleCollider(origin: [number, number, number]): Aabb {
  const halfW = CUBICLE.width / 2 + 0.045;
  const halfD = CUBICLE.depth / 2 + 0.045;
  return {
    minX: origin[0] - halfW,
    maxX: origin[0] + halfW,
    minZ: origin[2] + CUBICLE.offsetZ - halfD,
    maxZ: origin[2] + CUBICLE.offsetZ + halfD,
  };
}

export const BASE_HOTSPOTS: HotspotDef[] = [
  {
    id: "desk_player",
    label: "Your chair",
    position: [PLAYER_DESK[0], 0, PLAYER_DESK[2] + SEAT],
    radius: 1.7,
  },
  {
    id: "alert_wall",
    label: "Alert wall",
    position: [ALERT_POS[0], 0, ALERT_POS[2] + 0.6],
    radius: 1.7,
  },
  {
    id: "morgan_station",
    label: "Morgan",
    position: [MORGAN_DESK[0], 0, MORGAN_DESK[2] + SEAT],
    radius: 1.5,
  },
  {
    id: "break_door",
    label: "Break room door",
    position: [BREAK_NOOK.cornerX - 0.5, 0, BREAK_NOOK.doorZ],
    radius: 1.45,
  },
  {
    id: "storage",
    label: "Parts cabinets",
    position: [-9.55, 0, 4.6],
    radius: 1.5,
  },
  {
    id: "door_exit",
    label: "Exit to floor map",
    position: [0, 0, ROW.south],
    radius: 1.4,
  },
];

export const BREAK_INTERIOR_HOTSPOTS: HotspotDef[] = [
  { id: "jules", label: "Jules", position: [7.6, 0, -6.05], radius: 1.3 },
  {
    id: "coffee",
    label: "Coffee maker",
    position: [7.45, 0, -6.4],
    radius: 1.15,
  },
  { id: "fridge", label: "Fridge", position: [9.7, 0, -6.35], radius: 1.35 },
];

export function hotspotAnchor(
  id: HotspotId,
): [number, number, number] | undefined {
  for (const hotspot of BASE_HOTSPOTS) {
    if (hotspot.id === id) return hotspot.position;
  }
  for (const hotspot of BREAK_INTERIOR_HOTSPOTS) {
    if (hotspot.id === id) return hotspot.position;
  }
  return undefined;
}

export const ROOM_COLLIDERS: Aabb[] = [
  cubicleCollider(PLAYER_DESK),
  cubicleCollider(MORGAN_DESK),
  cubicleCollider(HOT_DESK),
  /** Samir's wall desk. */
  {
    minX: SAMIR_DESK[0] - 0.6,
    maxX: SAMIR_DESK[0] + 1.15,
    minZ: SAMIR_DESK[2] - 1.1,
    maxZ: SAMIR_DESK[2] + 1.1,
  },
  /** Alert boards. */
  {
    minX: ALERT_POS[0] - 2.0,
    maxX: ALERT_POS[0] + 2.0,
    minZ: ALERT_POS[2] - 0.7,
    maxZ: ALERT_POS[2] + 0.9,
  },
  /** Parts cabinets plus the travel of their open drawers. */
  { minX: INNER.minX, maxX: -9.4, minZ: 3.3, maxZ: 5.9 },
  /** Server racks on the north wall. */
  { minX: -10.2, maxX: -7.8, minZ: INNER.minZ, maxZ: -6.55 },
  /** Coat rack and lockers by the entrance. */
  { minX: 6.5, maxX: 10.0, minZ: 5.6, maxZ: 7.15 },
  /** South-west storage run. */
  { minX: -10.2, maxX: -7.5, minZ: 5.6, maxZ: 7.15 },
  /** Corner planters. */
  { minX: -4.1, maxX: -3.1, minZ: 6.2, maxZ: 7.2 },
  { minX: 4.75, maxX: 5.55, minZ: 6.2, maxZ: 7.2 },
];

export function socColliders(doorOpen: boolean): Aabb[] {
  return [...ROOM_COLLIDERS, ...breakNookColliders(doorOpen)];
}
