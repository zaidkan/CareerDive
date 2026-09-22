/**
 * Shared geometry + material registry for repeated office dressing.
 *
 * JSX `<meshStandardMaterial>` constructs a fresh material per mesh, which
 * multiplies uniform uploads and shader state switches. Static props whose
 * properties never vary should pull from here instead.
 *
 * Dynamic/emissive materials (breathing screens, severity colors) must stay
 * per-instance — do not share those.
 */
import * as THREE from "three";

function standard(
  color: string,
  roughness: number,
  metalness = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/** Box of unit size — scale per mesh; normals stay correct via normalMatrix. */
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
export const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 12);
export const UNIT_SPHERE = new THREE.SphereGeometry(1, 10, 8);

/** Chair casters share one sphere; spokes share one thin cylinder. */
export const CASTER_SPHERE = new THREE.SphereGeometry(0.055, 8, 6);
export const SPOKE_CYLINDER = new THREE.CylinderGeometry(0.025, 0.025, 0.28, 6);
export const RACK_LED_SPHERE = new THREE.SphereGeometry(1, 6, 4);
export const VENT_SLOT_BOX = new THREE.BoxGeometry(1, 1, 1);

export const MAT = {
  /** Desk legs / dark structural metal */
  darkMetal: standard("#30373c", 0.42, 0.45),
  /** Near-black plastic: monitor bezels, armrests, modesty panels */
  blackPlastic: standard("#16110e", 0.8, 0),
  pureBlack: standard("#0a0a0a", 0.7, 0.1),
  /** Chair spoke metal */
  steel: standard("#333333", 0.45, 0.6),
  casterTread: standard("#191d20", 0.88, 0),
  /** Chair post */
  postMetal: standard("#2a2a2a", 0.3, 0.7),
  /** Neutral painted sheet metal (cabinets, shredders) */
  paintedMetal: standard("#3a3a3a", 0.5, 0.35),
  /** Office wood tones */
  woodDark: standard("#2c241c", 0.5, 0),
  woodMid: standard("#4a3a2c", 0.55, 0),
  /** Fixture housing */
  fixtureHousing: standard("#566268", 0.42, 0.45),
  /** Locker carcass */
  lockerBody: standard("#39424b", 0.55, 0.25),
  lockerDoor: standard("#414c58", 0.5, 0.3),
  lockerDoorMid: standard("#495563", 0.5, 0.3),
  lockerBevel: standard("#4e5a68", 0.48, 0.28),
  lockerVent: standard("#0e1317", 0.8, 0),
  lockerKick: standard("#252c33", 0.6, 0.2),
  lockerCap: standard("#2e363e", 0.5, 0.3),
  lockerFace: standard("#12181d", 0.85, 0),
  /** Brass-ish handles */
  brass: standard("#c4a060", 0.3, 0.6),
  /** Small paper */
  paper: standard("#efe6d4", 0.85, 0),
  /** Window casing */
  casing: standard("#54636a", 0.38, 0.55),
  mullion: standard("#829093", 0.34, 0.55),
  /** Glass-break aluminium frames */
  frameAlu: standard("#7a8a90", 0.3, 0.6),
  frameAluSoft: standard("#7a8a90", 0.34, 0.55),
  jamb: standard("#6a7a80", 0.35, 0.55),
  /** Walls / architecture */
  wallTrim: standard("#4a3a2c", 0.8, 0),
  exitFrame: standard("#3a2c22", 0.65, 0),
  /** Rack chassis */
  rackChassis: standard("#2c3841", 0.38, 0.5),
  /** Cubicle fabric (shared map applied by furniture) — color-only shell */
  deskLegInk: standard("#16110e", 0.8, 0),
} as const;

/**
 * Trivial static props that only need a unit box with a color can use this
 * instead of declaring geometry + material JSX children (two fewer objects
 * per mesh in the React tree).
 */
export function disposeRegistry(): void {
  UNIT_BOX.dispose();
  UNIT_CYLINDER.dispose();
  UNIT_SPHERE.dispose();
  CASTER_SPHERE.dispose();
  SPOKE_CYLINDER.dispose();
  RACK_LED_SPHERE.dispose();
  VENT_SLOT_BOX.dispose();
  for (const mat of Object.values(MAT)) mat.dispose();
}
