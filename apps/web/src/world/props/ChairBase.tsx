import { useLayoutEffect, useRef } from "react";
import { InstancedMesh, Matrix4 } from "three";

/** Same transforms as the old rotated groups, uploaded only on mount. */
export function writeChairBaseInstances(
  mesh: InstancedMesh,
  spokes: boolean,
): void {
  const matrix = new Matrix4();
  const offset = new Matrix4().makeTranslation(
    spokes ? 0.3 : 0.42,
    spokes ? 0.08 : 0.06,
    0,
  );
  const tilt = new Matrix4().makeRotationZ(Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    matrix.makeRotationY((i / 5) * Math.PI * 2).multiply(offset);
    if (spokes) matrix.multiply(tilt);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/** Decorative only: two draw batches instead of ten separate meshes per chair. */
export function ChairBase() {
  const wheels = useRef<InstancedMesh>(null);
  const spokes = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (wheels.current) writeChairBaseInstances(wheels.current, false);
    if (spokes.current) writeChairBaseInstances(spokes.current, true);
  }, []);
  return (
    <>
      <instancedMesh ref={spokes} args={[undefined, undefined, 5]}>
        <cylinderGeometry args={[0.025, 0.025, 0.28, 8]} />
        <meshStandardMaterial color="#333" metalness={0.6} />
      </instancedMesh>
      <instancedMesh ref={wheels} args={[undefined, undefined, 5]}>
        <sphereGeometry args={[0.055, 8, 6]} />
        <meshStandardMaterial color="#0d0d0d" metalness={0.5} />
      </instancedMesh>
    </>
  );
}
