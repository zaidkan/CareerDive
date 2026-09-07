import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "../src/default-pack.js";

afterEach(() => vi.useRealTimers());

it("uses the real review clock by default while allowing a fixed replay fixture date", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2030-01-01"));
  expect(() => loadDefaultCybersecurityPack()).toThrow(
    "Career pack review is stale",
  );
  expect(() =>
    loadDefaultCybersecurityPack(new Date("2026-09-06")),
  ).not.toThrow();
});
