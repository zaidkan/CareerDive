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
    clear: () => { stored.clear(); },
  });
});
it("isolates local browser profiles and preserves each development identity across reload", async () => {
  vi.stubEnv("PROD", false);
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
  let transport = await import("../src/transport.js");
  const first = await transport.authHeaders();
  vi.resetModules();
  transport = await import("../src/transport.js");
  expect(await transport.authHeaders()).toEqual(first);
  window.localStorage.clear();
  const second = await transport.authHeaders();
  expect(second).not.toEqual(first);
  expect(second["x-user-id"]).toMatch(/^[0-9a-f-]{36}$/);
});

it("real simulation transport signs in anonymously, resumes, and refreshes using Bearer auth only", async () => {
  production();
  const { createInitialWorldState, toClientView } = await import("@sim/core");
  const { loadDefaultCybersecurityPack } = await import("@sim/career-packs");
  const view = toClientView(createInitialWorldState("anonymous-shift", 7, {}, loadDefaultCybersecurityPack()));
  let session: { access_token: string; expires_at: number } | null = null;
  auth.getSession.mockImplementation(async () => ({ data: { session }, error: null }));
  auth.signInAnonymously.mockImplementation(async () => {
    session = { access_token: "owner-a-token", expires_at: 9999999999 };
    return { data: { session }, error: null };
  });
  auth.refreshSession.mockImplementation(async () => {
    session = { access_token: "owner-a-refreshed", expires_at: 9999999999 };
    return { data: { session }, error: null };
  });
  const headers: Headers[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url.endsWith("/ready")) return Response.json({ status: "ready" });
    headers.push(new Headers(init?.headers));
    return new Response(JSON.stringify({ result: { data: { sessionId: view.sessionId, view } } }), {
      headers: { "content-type": "application/json" },
    });
  }));
  let { HttpSimulationClient } = await import("../src/client.js");
  const client = new HttpSimulationClient("https://api.offline.invalid");
  const input = { createRequestId: crypto.randomUUID(), seed: 7, sessionKind: "assessed", pacingMode: "standard" } as const;
  expect((await client.createSession(input)).sessionId).toBe(view.sessionId);
  vi.resetModules();
  ({ HttpSimulationClient } = await import("../src/client.js"));
  const reloaded = new HttpSimulationClient("https://api.offline.invalid");
  expect((await reloaded.getSession(view.sessionId)).sessionId).toBe(view.sessionId);
  session = { access_token: "owner-a-expired", expires_at: 1 };
  expect((await reloaded.getSession(view.sessionId)).sessionId).toBe(view.sessionId);
  expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
  expect(auth.refreshSession).toHaveBeenCalledTimes(1);
  expect(headers.map((h) => h.get("Authorization"))).toEqual([
    "Bearer owner-a-token", "Bearer owner-a-token", "Bearer owner-a-refreshed",
  ]);
  expect(headers.every((h) => !h.has("x-user-id"))).toBe(true);
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
  const first = await authHeaders();
  expect(first["x-user-id"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(await authHeaders()).toEqual(first);
});
