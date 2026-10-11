// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { LaunchEventNameSchema } from "@sim/schemas";

const { authHeaders } = vi.hoisted(() => ({ authHeaders: vi.fn() }));
vi.mock("../src/transport.js", () => ({ apiOrigin: "https://api.offline.invalid", authHeaders }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("launch configuration suppresses every event without network calls, identity creation, or storage writes", async () => {
  const blueprint = readFileSync("render.yaml", "utf8");
  expect(blueprint).toMatch(/key: VITE_LAUNCH_ANALYTICS_ENABLED\s+value: "false"/);
  expect(readFileSync(".env.example", "utf8")).toContain("VITE_LAUNCH_ANALYTICS_ENABLED=false");
  vi.stubEnv("VITE_LAUNCH_ANALYTICS_ENABLED", "false");
  const fetch = vi.fn();
  const setItem = vi.fn();
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("sessionStorage", { setItem });
  const { launchEvent } = await import("../src/analytics.js");
  for (const event of LaunchEventNameSchema.options) {
    launchEvent(event, "cybersecurity-analyst", "offline-occurrence");
  }
  expect(fetch).not.toHaveBeenCalled();
  expect(authHeaders).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  expect(readFileSync("apps/web/package.json", "utf8")).not.toMatch(/posthog/i);
});
