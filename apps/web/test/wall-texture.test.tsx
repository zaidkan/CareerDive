// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Texture } from "three";
import { WallPanel } from "../src/world/props/building.js";
import { makeWallTexture } from "../src/world/textures.js";

vi.mock("../src/world/textures.js", () => ({
  makeWallTexture: vi.fn(() => new Texture()),
}));

it("reuses wall textures for equal dimensions and releases replaced/unmounted textures", () => {
  const { rerender, unmount } = renderHook(
    ({ width }) => WallPanel({ position: [0, 0, 0], size: [width, 3, 0.3] }),
    { initialProps: { width: 8 } },
  );
  const factory = vi.mocked(makeWallTexture);
  const first = factory.mock.results[0]?.value as Texture;
  const disposeFirst = vi.spyOn(first, "dispose");
  rerender({ width: 8 });
  expect(factory).toHaveBeenCalledTimes(1);
  expect(disposeFirst).not.toHaveBeenCalled();
  rerender({ width: 12 });
  expect(factory).toHaveBeenCalledTimes(2);
  expect(disposeFirst).toHaveBeenCalledOnce();
  const second = factory.mock.results[1]?.value as Texture;
  const disposeSecond = vi.spyOn(second, "dispose");
  unmount();
  expect(disposeSecond).toHaveBeenCalledOnce();
});
