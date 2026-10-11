import { describe, expect, it } from "vitest";
import {
  CITY,
  CITY_TIERS,
  type CityBuilding,
  planCity,
} from "../src/world/cityLayout.js";

/** 0 on a street centreline, pitch / 2 mid-block. */
function gridOffset(v: number, origin: number): number {
  const m = (v - origin) % CITY.pitch;
  return m < 0 ? m + CITY.pitch : m;
}

/** [min, max] lies within one block, clear of every road and sidewalk. */
function insideOneBlock(min: number, max: number, origin: number): boolean {
  return (
    Math.floor((min - origin) / CITY.pitch) === Math.floor((max - origin) / CITY.pitch) &&
    gridOffset(min, origin) >= CITY.walkHalf &&
    gridOffset(max, origin) <= CITY.pitch - CITY.walkHalf
  );
}

describe("city outside the SOC glazing", () => {
  it("plans the same city every time", () => {
    for (const tier of [0, 1, 2] as const) expect(planCity(tier)).toEqual(planCity(tier));
  });

  it("grows with the quality tier without reshuffling the skyline", () => {
    const [low, med, high] = [planCity(0), planCity(1), planCity(2)];
    const key = (b: CityBuilding) => JSON.stringify(b);
    const medKeys = new Set(med.buildings.map(key));
    const highKeys = new Set(high.buildings.map(key));

    expect(low.buildings.length).toBeLessThan(med.buildings.length);
    expect(med.buildings.length).toBeLessThan(high.buildings.length);
    expect(low.buildings.filter((b) => !medKeys.has(key(b)))).toEqual([]);
    expect(med.buildings.filter((b) => !highKeys.has(key(b)))).toEqual([]);

    expect(low.cars.length).toBeLessThan(med.cars.length);
    expect(med.cars.length).toBeLessThan(high.cars.length);
    expect(high.cars.length).toBeLessThanOrEqual(CITY_TIERS[2].cars);

    expect(low.trees).toEqual([]);
    expect(med.trees.length).toBeGreaterThan(0);
  });

  it("keeps every footprint off the roads and out of the office's own block", () => {
    const { buildings } = planCity(2);
    const onStreet = buildings.filter(
      (b) =>
        !insideOneBlock(b.x - b.width / 2, b.x + b.width / 2, CITY.originX) ||
        !insideOneBlock(b.z - b.depth / 2, b.z + b.depth / 2, CITY.originZ),
    );
    const behindFacades = buildings.filter(
      (b) =>
        b.x + b.width / 2 <= CITY.originX - CITY.walkHalf &&
        b.z - b.depth / 2 >= CITY.originZ + CITY.walkHalf,
    );
    expect(onStreet).toEqual([]);
    expect(behindFacades).toEqual([]);
  });

  it("drives every car in a lane, keeping right, one speed per lane", () => {
    const laneSpeed = new Map<string, number>();
    for (const car of planCity(2).cars) {
      const origin = car.axis === 1 ? CITY.originX : CITY.originZ;
      const road = origin + Math.round((car.lane - origin) / CITY.pitch) * CITY.pitch;
      const off = car.lane - road;
      expect(CITY.laneOffsets).toContain(Math.abs(off));
      // Southbound (+z) west of a street's centreline, eastbound (+x) south of an avenue's.
      expect(Math.sign(car.speed)).toBe(car.axis === 1 ? -Math.sign(off) : Math.sign(off));
      const key = `${String(car.axis)}:${String(car.lane)}`;
      expect(car.speed).toBe(laneSpeed.get(key) ?? car.speed);
      laneSpeed.set(key, car.speed);
    }
  });

  it("stands lamps and trees on the fronting sidewalks, clear of junctions", () => {
    const { streetlights, trees } = planCity(2);
    for (const prop of [...streetlights, ...trees]) {
      const onAvenue = Math.abs(prop.z - CITY.originZ) < CITY.walkHalf;
      const across = onAvenue ? Math.abs(prop.z - CITY.originZ) : Math.abs(prop.x - CITY.originX);
      const along = onAvenue ? gridOffset(prop.x, CITY.originX) : gridOffset(prop.z, CITY.originZ);
      expect(across).toBeGreaterThan(CITY.roadHalf);
      expect(across).toBeLessThan(CITY.walkHalf);
      expect(Math.min(along, CITY.pitch - along)).toBeGreaterThan(CITY.walkHalf);
    }
  });
});
