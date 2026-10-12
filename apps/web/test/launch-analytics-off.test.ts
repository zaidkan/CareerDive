// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";

const { authHeaders } = vi.hoisted(() => ({ authHeaders: vi.fn() }));
vi.mock("../src/transport.js", () => ({ apiOrigin: "https://api.offline.invalid", authHeaders }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("launch configuration enables first-party events using no third-party analytics SDK", async () => {
  const blueprint = readFileSync("render.yaml", "utf8");
  expect(blueprint).toMatch(/key: VITE_LAUNCH_ANALYTICS_ENABLED\s+value: "true"/);
  vi.stubEnv("VITE_LAUNCH_ANALYTICS_ENABLED", "true");
  authHeaders.mockResolvedValue({});
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ saved: true }) });
  const store: Record<string, string> = {};
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  });
  const { launchEvent } = await import("../src/analytics.js");
  launchEvent("landing");
  await vi.waitFor(() => {
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  const call = fetch.mock.calls[0] ?? [];
  const url = call[0] as string;
  const init = call[1] as RequestInit;
  expect(url).toBe("https://api.offline.invalid/api/launch-events");
  expect(JSON.parse(init.body as string)).toMatchObject({ name: "landing" });
  expect(readFileSync("apps/web/package.json", "utf8")).not.toMatch(/posthog/i);
});
