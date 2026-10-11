/**
 * Deterministic low-poly downtown around the office tower, seen through the
 * north and east glazing. Pure data, so the plan is testable without WebGL.
 *
 * Same frame as the room: +X east, −Z north, office floor at y = 0. The
 * office is the north-east corner of its floor, so its north and east
 * facades front an avenue and a street; everything south-west of them is the
 * tower itself and never visible.
 */
import type { QualityTier } from "./effects/useAdaptiveQuality.js";

export const CITY = {
  /** Street level, roughly eleven floors below the office floor. */
  streetY: -42,
  /** Street centreline to centreline. */
  pitch: 82,
  /** Four 3.5m lanes. */
  roadHalf: 7,
  /** Road plus a 4m sidewalk each side. */
  walkHalf: 11,
  /** Centrelines of the street east of the tower and the avenue north of it. */
  originX: 22,
  originZ: -18.5,
  /** Inner and outer lane centres from a road centreline. */
  laneOffsets: [1.75, 5.25],
} as const;

/** Tallest towers cluster to the north-east, filling both windows. */
const DOWNTOWN = { x: 300, z: -330, radius: 340 } as const;
/** Blocks this close to the office stay low so the skyline reads over them. */
const NEAR_CAP = { radius: 130, height: 52 } as const;

export const CITY_TIERS = [
  { radius: 460, cars: 40, furnitureSpan: 160, trees: false, cloudOctaves: 3 },
  { radius: 680, cars: 100, furnitureSpan: 260, trees: true, cloudOctaves: 4 },
  { radius: 900, cars: 170, furnitureSpan: 320, trees: true, cloudOctaves: 5 },
] as const;

/** 0 glass curtain wall, 1 punched-window stone, 2 dark glass, 3 plain (plant, parks). */
export type FacadeKind = 0 | 1 | 2 | 3;

export type CityBuilding = {
  x: number;
  z: number;
  width: number;
  depth: number;
  /** World y of the base and the box height above it. */
  baseY: number;
  height: number;
  kind: FacadeKind;
  color: string;
  seed: number;
  /** Window column pitch and floor-to-floor height, metres. */
  cell: [number, number];
};

export type CityCar = {
  /** 0 drives along X, 1 along Z. */
  axis: 0 | 1;
  /** Fixed lane coordinate (z for axis 0, x for axis 1). */
  lane: number;
  spanStart: number;
  span: number;
  offset: number;
  /** Signed metres per second along the axis. */
  speed: number;
  color: string;
};

export type StreetProp = { x: number; z: number; yaw: number; scale: number; color: string };

export type CityPlan = {
  buildings: CityBuilding[];
  cars: CityCar[];
  streetlights: StreetProp[];
  trees: StreetProp[];
};

const BLOCK = CITY.pitch - CITY.walkHalf * 2;

const PALETTE: Record<FacadeKind, readonly string[]> = {
  0: ["#8195a8", "#73899d", "#90a5b5", "#7d9b9f", "#6e8191", "#9aaab6"],
  1: ["#d3cabd", "#c2b8a9", "#dcd6cb", "#b1aaa0", "#b99a84", "#cdbfa6", "#a8a49c"],
  2: ["#4e5a67", "#59636e", "#3f4a55", "#4a5560"],
  3: ["#9a9d9f", "#b3b5b5", "#8c9092"],
};
const PARK = "#6f8f52";
const CAR_COLORS = [
  "#e8e8e6",
  "#1d1f22",
  "#8d9196",
  "#b9bcc0",
  "#a3342c",
  "#2f4a6b",
  "#d9d4c6",
  "#56606b",
  "#c7a24a",
] as const;
const TREE_COLORS = ["#5d7f43", "#6a8a4a", "#557540", "#738f51"] as const;

/** mulberry32: tiny, fast, and identical on every platform. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellSeed(i: number, j: number, salt: number): number {
  return (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
}

function pick<T>(list: readonly T[], r: number): T {
  return list[Math.min(list.length - 1, Math.floor(r * list.length))] as T;
}

/** Street centrelines along one axis within `radius` of the office. */
export function streetLines(origin: number, radius: number): number[] {
  const first = Math.ceil((-radius - origin) / CITY.pitch);
  const last = Math.floor((radius - origin) / CITY.pitch);
  return Array.from({ length: last - first + 1 }, (_, k) => origin + (first + k) * CITY.pitch);
}

/** Blocks wholly south-west of the facades sit behind the office walls. */
function hiddenBehindTower(minX: number, maxX: number, minZ: number): boolean {
  return maxX <= CITY.originX - CITY.walkHalf && minZ >= CITY.originZ + CITY.walkHalf;
}

function heightAt(x: number, z: number, r: number): number {
  const dt = Math.exp(-((x - DOWNTOWN.x) ** 2 + (z - DOWNTOWN.z) ** 2) / DOWNTOWN.radius ** 2);
  const tower = r < 0.35 + dt * 0.45;
  const h = tower ? 34 + 230 * dt * (0.55 + r * 0.7) : 14 + 46 * dt + 26 * r;
  return Math.hypot(x, z) < NEAR_CAP.radius ? Math.min(h, NEAR_CAP.height * (0.45 + r)) : h;
}

function building(
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  r: () => number,
  baseY: number = CITY.streetY,
): CityBuilding {
  const kind: FacadeKind = height > 110 ? (r() < 0.7 ? 0 : 2) : height > 45 ? (r() < 0.45 ? 0 : 1) : 1;
  const cell: [number, number] =
    kind === 0 ? [1.6 + r() * 0.6, 3.6 + r() * 0.4] : kind === 2 ? [1.5 + r() * 0.4, 3.8 + r() * 0.4] : [2.6 + r() * 0.8, 3.4 + r() * 0.4];
  return { x, z, width, depth, baseY, height, kind, color: pick(PALETTE[kind], r()), seed: r(), cell };
}

function plant(parent: CityBuilding, r: () => number): CityBuilding[] {
  if (parent.height > 100) return [];
  const units = 1 + Math.floor(r() * 3);
  const roof = parent.baseY + parent.height;
  return Array.from({ length: units }, () => {
    const w = 3 + r() * 6;
    const d = 3 + r() * 6;
    return {
      x: parent.x + (r() - 0.5) * Math.max(0, parent.width - w - 6),
      z: parent.z + (r() - 0.5) * Math.max(0, parent.depth - d - 6),
      width: w,
      depth: d,
      baseY: roof,
      height: 2 + r() * 2.5,
      kind: 3 as const,
      color: pick(PALETTE[3], r()),
      seed: r(),
      cell: [3, 3] as [number, number],
    };
  });
}

/** One footprint: a plain box, or a podium with a slimmer setback tower. */
function massing(
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  r: () => number,
): CityBuilding[] {
  if (height > 110 && r() < 0.6) {
    const podium = height * (0.45 + r() * 0.2);
    const shrink = 0.6 + r() * 0.15;
    const base = building(x, z, width, depth, podium, r);
    const tower = building(x, z, width * shrink, depth * shrink, height - podium, r, CITY.streetY + podium);
    return [base, { ...tower, kind: base.kind, color: base.color, cell: base.cell }];
  }
  const box = building(x, z, width, depth, height, r);
  return [box, ...plant(box, r)];
}

function blockBuildings(i: number, j: number): CityBuilding[] {
  const r = rng(cellSeed(i, j, 1));
  const minX = CITY.originX + i * CITY.pitch + CITY.walkHalf;
  const minZ = CITY.originZ + j * CITY.pitch + CITY.walkHalf;
  const cx = minX + BLOCK / 2;
  const cz = minZ + BLOCK / 2;
  const style = r();
  if (style < 0.06 && Math.hypot(cx - DOWNTOWN.x, cz - DOWNTOWN.z) > DOWNTOWN.radius * 0.6) {
    return [
      { x: cx, z: cz, width: BLOCK - 2, depth: BLOCK - 2, baseY: CITY.streetY, height: 0.4, kind: 3, color: PARK, seed: r(), cell: [3, 3] },
    ];
  }
  if (style < 0.36) {
    const side = BLOCK - 14 - r() * 12;
    return massing(cx, cz, side, side, heightAt(cx, cz, r()), r);
  }
  if (style < 0.62) {
    const alongX = r() < 0.5;
    const thin = (BLOCK - 10) / 2;
    return [-1, 1].flatMap((s) => {
      const x = alongX ? cx : cx + s * (thin / 2 + 2.5);
      const z = alongX ? cz + s * (thin / 2 + 2.5) : cz;
      const w = alongX ? BLOCK - 4 - r() * 8 : thin - r() * 4;
      const d = alongX ? thin - r() * 4 : BLOCK - 4 - r() * 8;
      return massing(x, z, w, d, heightAt(x, z, r()), r);
    });
  }
  const lot = BLOCK / 2;
  return [-1, 1].flatMap((sx) =>
    [-1, 1].flatMap((sz) => {
      const x = cx + (sx * lot) / 2;
      const z = cz + (sz * lot) / 2;
      const w = lot - 4 - r() * 6;
      const d = lot - 4 - r() * 6;
      return massing(x, z, w, d, heightAt(x, z, r()), r);
    }),
  );
}

function plannedBlocks(radius: number): CityBuilding[] {
  const xs = streetLines(CITY.originX, radius + CITY.pitch);
  const zs = streetLines(CITY.originZ, radius + CITY.pitch);
  const out: CityBuilding[] = [];
  for (const x0 of xs) {
    for (const z0 of zs) {
      const minX = x0 + CITY.walkHalf;
      const minZ = z0 + CITY.walkHalf;
      if (hiddenBehindTower(minX, minX + BLOCK, minZ)) continue;
      if (Math.hypot(minX + BLOCK / 2, minZ + BLOCK / 2) > radius) continue;
      const i = Math.round((x0 - CITY.originX) / CITY.pitch);
      const j = Math.round((z0 - CITY.originZ) / CITY.pitch);
      out.push(...blockBuildings(i, j));
    }
  }
  return out;
}

/**
 * Right-hand traffic: northbound on the east half of a north–south road,
 * eastbound on the south half of an east–west one. Every car in a lane shares
 * its speed, so spacing never changes and cars never overlap in-lane.
 */
function plannedCars(radius: number, budget: number): CityCar[] {
  const span = radius * 2;
  const roads = [
    ...streetLines(CITY.originX, radius).map((at) => ({ axis: 1 as const, at })),
    ...streetLines(CITY.originZ, radius).map((at) => ({ axis: 0 as const, at })),
  ].sort((a, b) => Math.abs(a.at) - Math.abs(b.at));
  const cars: CityCar[] = [];
  const frontingPerLane = Math.max(5, Math.round(budget / 20));
  roads.forEach((road, rank) => {
    const perLane = rank < 2 ? frontingPerLane : 2;
    for (const side of [-1, 1] as const) {
      for (const [laneIndex, off] of CITY.laneOffsets.entries()) {
        const r = rng(cellSeed(Math.round(road.at), side * 3 + laneIndex, 7));
        const forward = road.axis === 1 ? side < 0 : side > 0;
        const speed = (laneIndex === 0 ? 12 + r() * 3 : 8 + r() * 3) * (forward ? 1 : -1);
        for (let k = 0; k < perLane && cars.length < budget; k += 1) {
          cars.push({
            axis: road.axis,
            lane: road.at + side * off,
            spanStart: -radius,
            span,
            offset: ((k + 0.5 + (r() - 0.5) * 0.5) * span) / perLane,
            speed,
            color: pick(CAR_COLORS, r()),
          });
        }
      }
    }
  });
  return cars.slice(0, budget);
}

/** Lamps and street trees line the avenue and street that front the office. */
function plannedFurniture(span: number, withTrees: boolean): Pick<CityPlan, "streetlights" | "trees"> {
  const r = rng(cellSeed(3, 5, 11));
  const streetlights: StreetProp[] = [];
  const trees: StreetProp[] = [];
  for (const axis of [0, 1] as const) {
    // Axis 0 lines the avenue (props run along X), axis 1 the street (along Z).
    const at = axis === 0 ? CITY.originZ : CITY.originX;
    const crossings = streetLines(axis === 0 ? CITY.originX : CITY.originZ, span + CITY.pitch);
    for (let step = Math.ceil(-span / 15); step <= Math.floor(span / 15); step += 1) {
      const s = step * 15;
      if (crossings.some((c) => Math.abs(s - c) < CITY.walkHalf + 2)) continue;
      const lamp = step % 2 === 0;
      for (const side of [-1, 1] as const) {
        const across = at + side * (lamp ? CITY.roadHalf + 0.6 : CITY.roadHalf + 2.4);
        const x = axis === 0 ? s : across;
        const z = axis === 0 ? across : s;
        // Lamp arms (local +X) reach back over the carriageway.
        const yaw = axis === 0 ? (side * Math.PI) / 2 : side < 0 ? 0 : Math.PI;
        if (lamp) streetlights.push({ x, z, yaw, scale: 1, color: "#3b4045" });
        else if (withTrees) {
          trees.push({ x, z, yaw: r() * Math.PI, scale: 1.7 + r() * 0.7, color: pick(TREE_COLORS, r()) });
        }
      }
    }
  }
  return { streetlights, trees };
}

export function planCity(tier: QualityTier): CityPlan {
  const spec = CITY_TIERS[tier];
  return {
    buildings: plannedBlocks(spec.radius),
    cars: plannedCars(Math.min(spec.radius, 600), spec.cars),
    ...plannedFurniture(spec.furnitureSpan, spec.trees),
  };
}
