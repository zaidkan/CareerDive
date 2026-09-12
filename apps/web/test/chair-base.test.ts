import { expect, it } from "vitest";
import { BoxGeometry, InstancedMesh, Matrix4, MeshBasicMaterial } from "three";
import { writeChairBaseInstances } from "../src/world/props/ChairBase.js";

it("preserves the former nested group transforms for every wheel and spoke", () => {
  const geometry = new BoxGeometry();
  const material = new MeshBasicMaterial();
  const mesh = new InstancedMesh(geometry, material, 5);
  for (const spokes of [false, true]) {
    writeChairBaseInstances(mesh, spokes);
    for (let i = 0; i < 5; i++) {
      const expected = new Matrix4()
        .makeRotationY((i / 5) * Math.PI * 2)
        .multiply(
          new Matrix4().makeTranslation(
            spokes ? 0.3 : 0.42,
            spokes ? 0.08 : 0.06,
            0,
          ),
        );
      if (spokes) expected.multiply(new Matrix4().makeRotationZ(Math.PI / 2));
      const actual = new Matrix4();
      mesh.getMatrixAt(i, actual);
      actual.elements.forEach((value, index) => {
        expect(value).toBeCloseTo(expected.elements[index] ?? 0, 6);
      });
    }
    expect(mesh.boundingSphere?.radius).toBeGreaterThan(0);
    expect(mesh.instanceMatrix.version).toBeGreaterThan(0);
  }
  mesh.dispose();
  geometry.dispose();
  material.dispose();
});
