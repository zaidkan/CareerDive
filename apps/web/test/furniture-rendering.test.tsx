// @vitest-environment jsdom
import { Children, isValidElement, type ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { SphereGeometry, Texture } from "three";
import { expect, it, vi } from "vitest";
import {
  CubicleWalls,
  DeskFrame,
  OfficeChair,
} from "../src/world/props/furniture.js";
import { ChairBase } from "../src/world/props/ChairBase.js";

vi.mock("../src/world/textures.js", () => ({
  makeWoodTexture: () => new Texture(),
  makeCubicleFabricTexture: () => new Texture(),
}));

function nodes(
  node: ReactNode,
): Array<{ type: unknown; props: Record<string, unknown> }> {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return [];
    return [
      { type: child.type, props: child.props },
      ...nodes(child.props.children as ReactNode),
    ];
  });
}

it("keeps five round chair wheels within a 400-triangle geometry budget", () => {
  expect(
    nodes(OfficeChair({ position: [0, 0, 0] })).filter(
      ({ type }) => type === ChairBase,
    ),
  ).toHaveLength(1);
  const { result } = renderHook(() => ChairBase());
  const batches = nodes(result.current).filter(
    ({ type }) => type === "instancedMesh",
  );
  expect(batches).toHaveLength(2);
  expect(batches.every(({ props }) => (props.args as unknown[])[2] === 5)).toBe(
    true,
  );
  const wheels = nodes(result.current).filter(
    ({ type }) => type === "sphereGeometry",
  );
  expect(wheels).toHaveLength(1);
  let triangles = 0;
  for (const wheel of wheels) {
    const args = wheel.props.args as [number, number, number];
    expect(args[0]).toBe(0.055);
    const geometry = new SphereGeometry(...args);
    triangles += ((geometry.index?.count ?? 0) / 3) * 5;
    geometry.dispose();
  }
  expect(triangles).toBeLessThanOrEqual(400);
});

it("uses the wood texture on the visible desk veneer without tinting it twice", () => {
  const { result } = renderHook(() => DeskFrame({ position: [0, 0, 0] }));
  const materials = nodes(result.current).filter(
    ({ type }) => type === "meshStandardMaterial",
  );
  expect(materials[0]?.props.map).toBeInstanceOf(Texture);
  expect(materials[1]?.props.map).toBe(materials[0]?.props.map);
  expect(materials[0]?.props.color).toBeUndefined();
  expect(materials[1]?.props.color).toBeUndefined();
});

it("does not multiply the authored cubicle fabric color again", () => {
  const { result } = renderHook(() => CubicleWalls({ position: [0, 0, 0] }));
  const fabric = nodes(result.current).filter(
    ({ props }) => props.map instanceof Texture,
  );
  expect(fabric).toHaveLength(3);
  expect(fabric.every(({ props }) => props.color === undefined)).toBe(true);
});
