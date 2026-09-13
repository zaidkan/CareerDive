import { InstancedMesh, Matrix4 } from "three";

/** Unit-box instances preserve the original boxes' UVs, size, and placement. */
export function writeCubicleInstances(
  mesh: InstancedMesh,
  width: number,
  depth: number,
  height: number,
  rails: boolean,
): void {
  const y = rails ? height + 0.03 : height / 2;
  const matrix = new Matrix4();
  matrix
    .makeScale(
      rails ? width + 0.05 : width,
      rails ? 0.06 : height,
      rails ? 0.1 : 0.08,
    )
    .setPosition(0, y, -depth / 2);
  mesh.setMatrixAt(0, matrix);
  for (let i = 1; i <= 2; i++) {
    matrix
      .makeScale(rails ? 0.1 : 0.08, rails ? 0.06 : height, depth)
      .setPosition(((i === 1 ? -1 : 1) * width) / 2, y, 0);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}
