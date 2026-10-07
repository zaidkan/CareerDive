// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useAdaptiveQuality } from "../src/world/effects/useAdaptiveQuality.js";
const harness = vi.hoisted(() => ({
  frame: vi.fn<(state: unknown, delta: number) => void>(),
}));
vi.mock("@react-three/fiber", () => ({
  useFrame: (frame: (state: unknown, delta: number) => void) => {
    harness.frame.mockImplementation(frame);
  },
  useThree: (selector: (state: unknown) => unknown) =>
    selector({ setDpr() {} }),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("clears accumulated stalls across tab visibility and removes its listener", () => {
  vi.spyOn(navigator, "hardwareConcurrency", "get").mockReturnValue(8);
  const remove = vi.spyOn(document, "removeEventListener");
  function Quality() {
    const quality = useAdaptiveQuality(false);
    return <span data-testid="tier">{quality.tier}</span>;
  }
  const { unmount } = render(<Quality />);
  act(() => {
    for (let index = 0; index < 9; index++) harness.frame({}, 0.2);
    document.dispatchEvent(new Event("visibilitychange"));
    harness.frame({}, 10);
  });
  expect(screen.getByTestId("tier").textContent).toBe("2");
  unmount();
  expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
});
