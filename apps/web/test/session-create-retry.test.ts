// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createInitialWorldState, toClientView } from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";

vi.mock("../src/transport.js", () => ({
  apiOrigin: "https://api.invalid",
  authHeaders: async () => ({ Authorization: "Bearer original-owner" }),
}));
afterEach(() => {
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("retries a lost creation response after reload only with the original persisted request ID", async () => {
  const input = {
    createRequestId: crypto.randomUUID(),
    seed: 24,
    sessionKind: "assessed" as const,
    pacingMode: "standard" as const,
  };
  const view = toClientView(
    createInitialWorldState(
      crypto.randomUUID(),
      24,
      {},
      loadDefaultCybersecurityPack(),
    ),
  );
  const committed = new Set<string>();
  let calls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/ready")) return new Response("ok");
      if (typeof init?.body !== "string") throw new Error("Expected JSON body");
      const request = JSON.parse(init.body) as typeof input;
      expect(request).toEqual(input);
      committed.add(request.createRequestId);
      calls++;
      if (calls === 1) throw new Error("Response lost after database commit");
      return new Response(
        JSON.stringify({
          result: { data: { sessionId: view.sessionId, view } },
        }),
        {
          headers: { "content-type": "application/json" },
        },
      );
    }),
  );
  const first = await import("../src/client.js");
  await expect(first.defaultClient.createSession(input)).rejects.toMatchObject({
    safeToRetry: true,
    category: "creation-unconfirmed",
  });
  vi.resetModules();
  const reloaded = await import("../src/client.js");
  await expect(
    reloaded.defaultClient.createSession({
      ...input,
      createRequestId: crypto.randomUUID(),
    }),
  ).rejects.toMatchObject({ safeToRetry: false });
  const withoutId = {
    seed: input.seed,
    sessionKind: input.sessionKind,
    pacingMode: input.pacingMode,
  };
  await expect(
    reloaded.defaultClient.createSession(withoutId),
  ).rejects.toMatchObject({ safeToRetry: false });
  expect(calls).toBe(1);
  expect(await reloaded.defaultClient.createSession(input)).toEqual({
    sessionId: view.sessionId,
    view,
  });
  expect(calls).toBe(2);
  expect(committed.size).toBe(1);
});

it("keeps legacy ambiguous starts without a recorded request ID blocked", async () => {
  window.sessionStorage.setItem("career-expo-start-pending", "true");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { defaultClient } = await import("../src/client.js");
  await expect(
    defaultClient.createSession({
      createRequestId: crypto.randomUUID(),
      seed: 24,
      sessionKind: "assessed",
      pacingMode: "standard",
    }),
  ).rejects.toMatchObject({ safeToRetry: false });
  expect(fetchMock).not.toHaveBeenCalled();
});
