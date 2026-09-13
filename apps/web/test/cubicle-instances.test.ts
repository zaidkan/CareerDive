import { expect, it } from "vitest";
import { BoxGeometry, InstancedMesh, Matrix4, MeshBasicMaterial } from "three";
import { writeCubicleInstances } from "../src/world/props/cubicleInstances.js";

it.each([
  [2.6, 2.2, 1.35],
  [2.95, 2.55, 1.35],
])(
  "preserves panel and rail bounds at %s x %s x %s",
  (width, depth, height) => {
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshBasicMaterial();
    const mesh = new InstancedMesh(geometry, material, 3);
    for (const rails of [false, true]) {
      writeCubicleInstances(mesh, width, depth, height, rails);
      const scales = rails
        ? [
            [width + 0.05, 0.06, 0.1],
            [0.1, 0.06, depth],
            [0.1, 0.06, depth],
          ]
        : [
            [width, height, 0.08],
            [0.08, height, depth],
            [0.08, height, depth],
          ];
      const positions = [
        [0, rails ? height + 0.03 : height / 2, -depth / 2],
        [-width / 2, rails ? height + 0.03 : height / 2, 0],
        [width / 2, rails ? height + 0.03 : height / 2, 0],
      ];
      for (let i = 0; i < 3; i++) {
        const actual = new Matrix4();
        mesh.getMatrixAt(i, actual);
        const position = positions[i] ?? [];
        const scale = scales[i] ?? [];
        const expected = new Matrix4()
          .makeScale(scale[0] ?? 1, scale[1] ?? 1, scale[2] ?? 1)
          .setPosition(position[0] ?? 0, position[1] ?? 0, position[2] ?? 0);
        actual.elements.forEach((value, index) => {
          expect(value).toBeCloseTo(expected.elements[index] ?? 0, 6);
        });
      }
      expect(mesh.boundingSphere?.radius).toBeGreaterThan(width / 2);
    }
    mesh.dispose();
    geometry.dispose();
    material.dispose();
  },
);
