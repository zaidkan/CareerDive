import { describe, expect, it } from "vitest";
import { nearestHotspot } from "../src/world/Hotspot.js";
import {
  BASE_HOTSPOTS,
  cubicleCollider,
  isStandable,
  PLAYER_DESK,
  SEAT,
  socColliders,
} from "../src/world/rooms/socLayout.js";

/** Asserts against the real layout, so moving furniture cannot silently break sitting. */
const deskHotspot = BASE_HOTSPOTS.find((h) => h.id === "desk_player");
if (!deskHotspot) throw new Error("desk_player hotspot missing");

const colliders = socColliders(false);

describe("SOC sit zone", () => {
  it("puts the chair hotspot in front of the cubicle, not inside it", () => {
    const cubicle = cubicleCollider(PLAYER_DESK);

    expect(deskHotspot.position[2]).toBeGreaterThan(cubicle.maxZ);
  });

  it("leaves walkable floor right up against the chair", () => {
    const [x, , z] = deskHotspot.position;
    /** The chair itself is solid; standing a few cm short of it is enough. */
    const approach = [0, 0.1, 0.2, 0.3, 0.4].find((gap) =>
      isStandable(x, z + gap, colliders),
    );

    expect(approach).toBeDefined();
    expect(approach ?? 1).toBeLessThanOrEqual(0.2);
  });

  it("detects the desk when standing in the walkable sit zone", () => {
    const approach: [number, number, number] = [
      PLAYER_DESK[0],
      1.6,
      PLAYER_DESK[2] + SEAT + 0.4,
    ];

    expect(isStandable(approach[0], approach[2], colliders)).toBe(true);
    expect(nearestHotspot(approach, BASE_HOTSPOTS)?.id).toBe("desk_player");
  });

  it("does not require standing inside furniture to sit", () => {
    const [x, , z] = deskHotspot.position;
    const cubicle = cubicleCollider(PLAYER_DESK);
    const insideCubicle: [number, number, number] = [
      x,
      1.6,
      (cubicle.minZ + cubicle.maxZ) / 2,
    ];

    expect(isStandable(insideCubicle[0], insideCubicle[2], colliders)).toBe(false);
    expect(nearestHotspot([x, 1.6, z], BASE_HOTSPOTS)?.id).toBe("desk_player");
  });
});
