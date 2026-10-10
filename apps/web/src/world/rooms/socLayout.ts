/**
 * Single source of truth for the SOC floor plan.
 *
 * Colliders, hotspots and prop origins all derive from these constants so a
 * furniture move cannot silently strand a hotspot behind a collider. The
 * reachability test in test/soc-layout.test.ts asserts exactly that.
 *
 * The plan matches the arrival film's last frame, seen from the spawn looking
 * north: a frosted-glass suite on the left meets the free-standing 04 feature
 * wall (credenza and plant in front of it), the desks fill the right half, and
 * the back office and break room sit where that shot cannot see them.
 */
import type { Aabb } from "../collision.js";
import type { HotspotDef } from "../Hotspot.js";
import type { HotspotId } from "../worldTypes.js";
import { BREAK_NOOK, breakNookColliders } from "./GlassBreakNook.js";
import { SAFE_ANCHORS } from "../navigation.js";

export { SAFE_ANCHORS };

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
 * Two cubicle columns side by side on the right half of the room. The window
 * column leaves a walkable strip along the east glazing.
 */
export const COL = { east: 3.8, window: 6.85 } as const;
/** The back row leaves an aisle wide enough to stand at Morgan's chair. */
export const ROW = { north: -2.0, back: -6.0, south: 6.6 } as const;
export const SEAT = 1.65;

/** Chairs face desks (−Z); seat back is local −Z so rotate π. */
export const CHAIR_FACE_DESK = Math.PI;

/** Where the arrival film's camera comes to rest, a few steps inside the door. */
export const PLAYER_SPAWN: [number, number, number] = [0, 1.6, 4.6];
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
/** Morgan sits directly behind the player, across the back aisle. */
export const MORGAN_DESK: [number, number, number] = [COL.east, 0, ROW.back];
/** Empty desk beside the player, by the east glazing. */
export const HOT_DESK: [number, number, number] = [COL.window, 0, ROW.north];
/** Unassigned desk that completes the back row. */
export const TEAM_DESK: [number, number, number] = [COL.window, 0, ROW.back];

/**
 * Frosted-glass curtain wall on the entry-left. The suite behind it is sealed:
 * the glass is a solid wall, and nothing inside it is reachable.
 */
export const GLASS_SUITE = { glassX: -3.9, minZ: -0.7, maxZ: INNER.maxZ } as const;

/**
 * Free-standing 04 feature wall. It closes the suite's north end and stops
 * short of the main aisle, so the room continues behind and to its right.
 */
export const FEATURE_WALL = {
  minX: GLASS_SUITE.glassX,
  maxX: -0.55,
  z: -0.6,
  depth: 0.2,
  height: 3.0,
  /** Honey-oak slats on the glass end stand proud of the wall face. */
  slatWidth: 0.7,
  slatDepth: 0.04,
} as const;
/** South face of the feature wall, the side readable from the entry. */
export const FEATURE_WALL_FACE_Z = FEATURE_WALL.z + FEATURE_WALL.depth / 2;

/** Walnut credenza against the feature wall, under the 04 signage. */
export const CREDENZA = {
  x: -2.05,
  z: FEATURE_WALL_FACE_Z + 0.26,
  width: 2.3,
  depth: 0.48,
  height: 0.78,
} as const;

/** Large potted plant in front of the glass, near the entry. */
export const HERO_PLANT: [number, number, number] = [-2.75, 0, 1.55];
/** Smaller planter in the corner between the glass and the entry wall. */
export const ENTRY_PLANTER: [number, number, number] = [-3.25, 0, 6.65];

/** Underside of the linear pendants; the 04 wall and cubicles stay well below. */
export const PENDANT_HANG_Y = 3.02;
/** Long black pendants in parallel rows over the desk field, plus one entry run. */
export const PENDANT_RUNS = [
  ...[1.0, -1.0, -3.0, -5.0].map((z) => ({ x: 5.6, z, length: 9.4 })),
  { x: 3.0, z: 3.4, length: 3.0 },
] as const;
/** LED spot track over the credenza, washing the 04 wall. */
export const FEATURE_WALL_SPOTS = { x: CREDENZA.x, z: FEATURE_WALL_FACE_Z + 0.9 } as const;

/** Back office behind the 04 wall: alert boards, racks, Samir, parts. */
export const ALERT_POS: [number, number, number] = [-4.4, 0, -6.2];
export const SAMIR_DESK: [number, number, number] = [-10.25, 0, -3.4];
export const SERVER_RACK_XS = [-9.8, -9.0, -8.2] as const;
/** Parts cabinets back onto the suite wall and open north into the office. */
export const PARTS_CABINETS = {
  xs: [-8.4, -7.2] as const,
  z: GLASS_SUITE.minZ - 0.3,
} as const;
export const SHREDDER: [number, number, number] = [-6.15, 0, GLASS_SUITE.minZ - 0.22];
export const BACK_OFFICE_BINS: [number, number, number][] = [
  [-9.55, 0, GLASS_SUITE.minZ - 0.24],
  [-10.05, 0, GLASS_SUITE.minZ - 0.24],
];

/** Coat rack, lockers and bins along the entry wall, east of the door. */
export const COAT_RACK: [number, number, number] = [1.75, 0, 6.85];
export const LOCKERS: [number, number, number] = [3.7, 0.95, INNER.maxZ - 0.27];
export const ENTRY_BINS: [number, number, number][] = [
  [5.45, 0, 7.0],
  [5.9, 0, 7.0],
];

/** Workstation cubicle: 2.95 x 2.55 fabric walls, offset +0.1 in Z. */
export const CUBICLE = { width: 2.95, depth: 2.55, offsetZ: 0.1 } as const;

/**
 * Cubicle footprint for lane and anchor measurements. Movement uses the
 * separate wall and desk colliders below, so the open front stays walkable.
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

/** Collision follows the U-shaped fabric walls and desk, leaving the front open. */
export function cubicleColliders(origin: [number, number, number]): Aabb[] {
  const bounds = cubicleCollider(origin);
  return [
    { ...bounds, maxZ: bounds.minZ + 0.09 },
    { ...bounds, maxX: bounds.minX + 0.09 },
    { ...bounds, minX: bounds.maxX - 0.09 },
    {
      minX: origin[0] - 1.125,
      maxX: origin[0] + 1.125,
      minZ: origin[2] - 0.75,
      maxZ: origin[2] + 0.35,
    },
  ];
}

export const BASE_HOTSPOTS: HotspotDef[] = [
  {
    id: "desk_player",
    label: "Your chair",
    position: [PLAYER_DESK[0], 0, PLAYER_DESK[2] + SEAT],
    radius: 2.2,
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
    position: [
      (PARTS_CABINETS.xs[0] + PARTS_CABINETS.xs[1]) / 2,
      0,
      PARTS_CABINETS.z - 1.25,
    ],
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
  { id: "jules", label: "Jules", position: [7.6, 0, 6.05], radius: 1.3 },
  {
    id: "coffee",
    label: "Coffee maker",
    position: [7.45, 0, 6.4],
    radius: 1.15,
  },
  { id: "fridge", label: "Fridge", position: [9.7, 0, 6.35], radius: 1.35 },
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
  ...cubicleColliders(PLAYER_DESK),
  ...cubicleColliders(MORGAN_DESK),
  ...cubicleColliders(HOT_DESK),
  ...cubicleColliders(TEAM_DESK),
  /** Frosted-glass suite: solid glass, sealed room behind it. */
  {
    minX: INNER.minX,
    maxX: GLASS_SUITE.glassX + 0.06,
    minZ: GLASS_SUITE.minZ,
    maxZ: GLASS_SUITE.maxZ,
  },
  /** 04 feature wall, including the slats proud of its face. */
  {
    minX: FEATURE_WALL.minX,
    maxX: FEATURE_WALL.maxX,
    minZ: FEATURE_WALL.z - FEATURE_WALL.depth / 2,
    maxZ: FEATURE_WALL_FACE_Z + FEATURE_WALL.slatDepth,
  },
  /** Credenza in front of the feature wall. */
  {
    minX: CREDENZA.x - CREDENZA.width / 2 - 0.03,
    maxX: CREDENZA.x + CREDENZA.width / 2 + 0.03,
    minZ: FEATURE_WALL_FACE_Z,
    maxZ: CREDENZA.z + CREDENZA.depth / 2 + 0.03,
  },
  /** Hero plant pot. */
  {
    minX: HERO_PLANT[0] - 0.45,
    maxX: HERO_PLANT[0] + 0.45,
    minZ: HERO_PLANT[2] - 0.45,
    maxZ: HERO_PLANT[2] + 0.45,
  },
  /** Entry corner planter. */
  {
    minX: ENTRY_PLANTER[0] - 0.4,
    maxX: ENTRY_PLANTER[0] + 0.4,
    minZ: ENTRY_PLANTER[2] - 0.4,
    maxZ: INNER.maxZ,
  },
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
  {
    minX: PARTS_CABINETS.xs[0] - 0.6,
    maxX: PARTS_CABINETS.xs[1] + 0.6,
    minZ: PARTS_CABINETS.z - 0.7,
    maxZ: GLASS_SUITE.minZ,
  },
  /** Shredder and bins on the suite wall. */
  { minX: SHREDDER[0] - 0.32, maxX: SHREDDER[0] + 0.32, minZ: SHREDDER[2] - 0.25, maxZ: GLASS_SUITE.minZ },
  { minX: INNER.minX, maxX: -9.3, minZ: GLASS_SUITE.minZ - 0.5, maxZ: GLASS_SUITE.minZ },
  /** Server racks on the north wall. */
  { minX: -10.2, maxX: -7.8, minZ: INNER.minZ, maxZ: -6.55 },
  /** Coat rack, lockers and bins along the entry wall. */
  { minX: 1.4, maxX: 6.15, minZ: 6.45, maxZ: INNER.maxZ },
];

export function socColliders(doorOpen: boolean): Aabb[] {
  return [...ROOM_COLLIDERS, ...breakNookColliders(doorOpen)];
}
