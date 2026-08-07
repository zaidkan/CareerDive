import { describe, expect, it } from "vitest";
import { nearestHotspot, type HotspotDef } from "../src/world/Hotspot.js";

/** Mirrors SocRoom layout — keep in sync when moving furniture. */
const HOTSPOTS: HotspotDef[] = [
  {
    id: "desk_player",
    label: "Your chair",
    position: [3.2, 0, -1.5],
    radius: 1.7,
  },
];

const DESK_COLLIDER = {
  minX: 2.1,
  maxX: 4.5,
  minZ: -4.2,
  maxZ: -2.35,
};

function insideCollider(
  x: number,
  z: number,
  box: typeof DESK_COLLIDER,
  radius = 0.32,
): boolean {
  return (
    x + radius > box.minX &&
    x - radius < box.maxX &&
    z + radius > box.minZ &&
    z - radius < box.maxZ
  );
}

describe("SOC sit zone", () => {
  it("keeps the chair hotspot outside the desk collider", () => {
    const [x, , z] = HOTSPOTS[0]!.position;
    expect(insideCollider(x, z, DESK_COLLIDER)).toBe(false);
  });

  it("detects the desk when standing in the walkable sit zone", () => {
    const near = nearestHotspot([3.2, 1.6, -1.2], HOTSPOTS);
    expect(near?.id).toBe("desk_player");
  });

  it("does not require standing inside furniture to sit", () => {
    const approach = [3.2, 1.6, -0.4] as [number, number, number];
    expect(insideCollider(approach[0], approach[2], DESK_COLLIDER)).toBe(false);
    expect(nearestHotspot(approach, HOTSPOTS)?.id).toBe("desk_player");
  });
});
