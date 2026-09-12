import { expect, it } from "vitest";
import {
  createRenderSamples,
  recordRenderSample,
  summarizeRenderSamples,
  graphicsDiagnosticsEnabled,
} from "../src/world/diagnostics/renderMetrics.js";

it("requires both development mode and explicit opt-in", () => {
  expect(graphicsDiagnosticsEnabled(true, "?graphics=1")).toBe(true);
  expect(graphicsDiagnosticsEnabled(false, "?graphics=1")).toBe(false);
  expect(graphicsDiagnosticsEnabled(true, "")).toBe(false);
});

it("keeps severe stalls and calculates frame time percentiles, not GPU time", () => {
  const samples = createRenderSamples();
  for (let i = 0; i < 19; i++) recordRenderSample(samples, 0.01, 100, 2000);
  recordRenderSample(samples, 0.5, 200, 4000);
  const summary = summarizeRenderSamples(samples);
  expect(summary?.fps).toBeCloseTo(20 / 0.69);
  expect(summary?.p95Ms).toBeCloseTo(10);
  expect(summary?.maxMs).toBe(500);
  expect(summary?.meanCalls).toBe(105);
});

it("bounds memory and rejects invalid time samples", () => {
  const samples = createRenderSamples();
  for (let i = 0; i < 1000; i++) recordRenderSample(samples, 0.02, 10, 100);
  recordRenderSample(samples, NaN, 10, 100);
  recordRenderSample(samples, Infinity, 10, 100);
  recordRenderSample(samples, 0, 10, 100);
  expect(samples.count).toBe(300);
  expect(summarizeRenderSamples(samples)?.fps).toBeCloseTo(50);
});
