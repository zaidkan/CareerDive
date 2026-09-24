import * as THREE from "three";

function standard(
  color: string,
  roughness: number,
  metalness = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
export const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 12);
export const CASTER_SPHERE = new THREE.SphereGeometry(0.055, 8, 6);
export const SPOKE_CYLINDER = new THREE.CylinderGeometry(0.025, 0.025, 0.28, 6);

export const MAT = {
  darkMetal: standard("#30373c", 0.42, 0.45),
  blackPlastic: standard("#16110e", 0.8, 0),
  steel: standard("#333333", 0.45, 0.6),
  casterTread: standard("#191d20", 0.88, 0),
  postMetal: standard("#2a2a2a", 0.3, 0.7),
} as const;

export function disposeRegistry(): void {
  UNIT_BOX.dispose();
  UNIT_CYLINDER.dispose();
  CASTER_SPHERE.dispose();
  SPOKE_CYLINDER.dispose();
  for (const mat of Object.values(MAT)) mat.dispose();
}
