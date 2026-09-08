import { Children, isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { SocLighting } from "../src/world/rooms/SocLighting.js";

function lights(seated: boolean) {
  return Children.toArray(
    SocLighting({ seated, directionalShadows: true }).props.children,
  ).filter(
    isValidElement<{
      intensity?: number;
      color?: string;
      castShadow?: boolean;
    }>,
  );
}
describe("SOC lighting budget", () => {
  it("uses four existing lights with only the directional light casting shadows", () => {
    const result = lights(false);
    expect(result.map(({ type }) => type)).toEqual([
      "hemisphereLight",
      "ambientLight",
      "directionalLight",
      "pointLight",
    ]);
    expect(result.filter(({ props }) => props.castShadow)).toHaveLength(1);
    expect(result.find(({ type }) => type === "pointLight")?.props.color).toBe(
      "#ffd49b",
    );
  });
  it("reduces direct lighting while seated and honors the quality shadow switch", () => {
    const seated = lights(true);
    const walking = lights(false);
    for (const type of ["ambientLight", "directionalLight", "pointLight"]) {
      expect(
        seated.find((light) => light.type === type)?.props.intensity,
      ).toBeLessThan(
        walking.find((light) => light.type === type)?.props.intensity ?? 0,
      );
    }
    const children = Children.toArray(
      SocLighting({ seated: false, directionalShadows: false }).props.children,
    );
    expect(
      children.filter(
        (child) =>
          isValidElement<{ castShadow?: boolean }>(child) &&
          child.props.castShadow,
      ),
    ).toHaveLength(0);
  });
});
