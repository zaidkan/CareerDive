// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { HttpSimulationClient } from "../src/client.js";

const { authHeaders } = vi.hoisted(() => ({ authHeaders: vi.fn() }));
vi.mock("../src/transport.js", () => ({
  apiOrigin: "http://localhost:3001", authHeaders,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  authHeaders.mockReset();
  vi.useRealTimers();
});

it("does not POST while identity is still pending after readiness succeeds", async () => {
  let identify!: (headers: Record<string, string>) => void;
  authHeaders.mockReturnValue(new Promise<Record<string, string>>((resolve) => { identify = resolve; }));
  const view = toClientView(createInitialWorldState(
    "identity-barrier", 7, {}, loadDefaultCybersecurityPack(),
  ));
  const posts: RequestInit[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith("/ready")) return Response.json({ status: "ready" });
    posts.push(options ?? {});
    return Response.json({ result: { data: { sessionId: view.sessionId, view } } });
  }));
  const created = new HttpSimulationClient("http://localhost:3001").createSession({
    seed: 7, sessionKind: "assessed", pacingMode: "standard",
  });
  await vi.waitFor(() => { expect(authHeaders).toHaveBeenCalled(); });
  expect(posts).toHaveLength(0);
  identify({ Authorization: "Bearer same-owner" });
  await expect(created).resolves.toMatchObject({ sessionId: "identity-barrier" });
  expect(posts).toHaveLength(1);
});

it("stops readiness polling when identity fails without a session POST", async () => {
  vi.useFakeTimers();
  authHeaders.mockRejectedValue(new Error("Identity unavailable"));
  const fetch = vi.fn().mockResolvedValue(new Response("Starting", { status: 503 }));
  vi.stubGlobal("fetch", fetch);
  await expect(new HttpSimulationClient("http://localhost:3001").createSession({
    seed: 7, sessionKind: "assessed", pacingMode: "standard",
  })).rejects.toMatchObject({ safeToRetry: true, category: "identity-unavailable" });
  await vi.advanceTimersByTimeAsync(90_000);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(String(fetch.mock.calls[0]?.[0])).toMatch(/\/ready$/);
});

it("overlaps identity preparation with API wake-up without creating a shift early", async () => {
  let ready!: (response: Response) => void;
  let identify!: (headers: Record<string, string>) => void;
  const identity = new Promise<Record<string, string>>((resolve) => { identify = resolve; });
  authHeaders.mockReturnValue(identity);
  const view = toClientView(createInitialWorldState(
    "fast-start", 7, {}, loadDefaultCybersecurityPack(),
  ));
  const posts: RequestInit[] = [];
  vi.stubGlobal("fetch", vi.fn((url: string, options?: RequestInit) => {
    if (url.endsWith("/ready")) return new Promise<Response>((resolve) => { ready = resolve; });
    posts.push(options ?? {});
    return Promise.resolve(Response.json({ result: { data: { sessionId: view.sessionId, view } } }));
  }));
  const created = new HttpSimulationClient("http://localhost:3001").createSession({
    seed: 7, sessionKind: "assessed", pacingMode: "standard",
  });
  try {
    expect(authHeaders).toHaveBeenCalled();
    expect(posts).toHaveLength(0);
  } finally {
    identify({ Authorization: "Bearer same-owner" });
    ready(Response.json({ status: "ready" }));
    await created;
  }
  expect(posts).toHaveLength(1);
  expect(new Headers(posts[0]?.headers).get("Authorization")).toBe("Bearer same-owner");
});
