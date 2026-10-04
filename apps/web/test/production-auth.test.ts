// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
  refreshSession: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth })),
}));
beforeEach(() => {
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => {
      stored.set(key, value);
    },
    removeItem: (key: string) => {
      stored.delete(key);
    },
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});
function production() {
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_SUPABASE_URL", "https://offline.invalid");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "sb_publishable_offline");
}
it("creates one anonymous identity for concurrent requests and sends bearer only", async () => {
  production();
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.signInAnonymously.mockResolvedValue({
    data: {
      session: { access_token: "verified-token", expires_at: 9999999999 },
    },
    error: null,
  });
  const { authHeaders } = await import("../src/transport.js");
  const results = await Promise.all(
    Array.from({ length: 8 }, () => authHeaders()),
  );
  expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
  expect(
    results.every(
      (headers) =>
        headers.Authorization === "Bearer verified-token" &&
        !("x-user-id" in headers),
    ),
  ).toBe(true);
});
it("restores identity, refreshes expired token, and never creates replacement owner on refresh failure", async () => {
  production();
  auth.getSession.mockResolvedValue({
    data: { session: { access_token: "expired", expires_at: 1 } },
    error: null,
  });
  auth.refreshSession.mockResolvedValueOnce({
    data: { session: { access_token: "fresh" } },
    error: null,
  });
  const { authHeaders } = await import("../src/transport.js");
  expect(await authHeaders()).toEqual({ Authorization: "Bearer fresh" });
  auth.refreshSession.mockResolvedValueOnce({
    data: { session: null },
    error: new Error("offline"),
  });
  await expect(authHeaders()).rejects.toThrow("Identity refresh failed");
  expect(auth.signInAnonymously).not.toHaveBeenCalled();
});
it("production fails closed with missing configuration; development remains usable", async () => {
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
  const { authHeaders } = await import("../src/transport.js");
  await expect(authHeaders()).rejects.toThrow("not configured");
  vi.stubEnv("PROD", false);
  expect(await authHeaders()).toEqual({
    "x-user-id": "00000000-0000-4000-8000-000000000001",
  });
});
