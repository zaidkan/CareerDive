// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DEFAULT_QUALITY } from "../src/world/effects/useAdaptiveQuality.js";
import { PerfOverlay } from "../src/world/effects/perfDiagnostics.js";
vi.mock("@react-three/fiber", () => ({
  useFrame: vi.fn(),
  useThree: (selector: (state: unknown) => unknown) =>
    selector({
      gl: {},
      viewport: { dpr: 1 },
    }),
}));
afterEach(cleanup);
it("owns one DOM overlay outside the scene and removes it on unmount", () => {
  const { rerender, unmount, container } = render(
    <PerfOverlay quality={DEFAULT_QUALITY} />,
  );
  expect(container.childElementCount).toBe(0);
  expect(
    document.querySelectorAll('[data-testid="perf-overlay"]'),
  ).toHaveLength(1);
  rerender(<PerfOverlay quality={{ ...DEFAULT_QUALITY, tier: 1 }} />);
  expect(
    document.querySelectorAll('[data-testid="perf-overlay"]'),
  ).toHaveLength(1);
  unmount();
  expect(
    document.querySelectorAll('[data-testid="perf-overlay"]'),
  ).toHaveLength(0);
});
