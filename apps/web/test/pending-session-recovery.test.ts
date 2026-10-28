// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { createBrowserStorage } from "./helpers/browserStorage.js";
import { defaultClient, PENDING_SESSION_KEY } from "../src/client.js";

vi.mock("../src/transport.js", () => ({
  apiOrigin: "http://localhost:3001",
  authHeaders: async () => ({ Authorization: "Bearer same-owner" }),
}));
const input = {
  createRequestId: "9cb72043-b6c1-4a7f-8553-368d534248b7",
  seed: 7,
  sessionKind: "assessed",
  pacingMode: "standard",
} as const;
const view = toClientView(createInitialWorldState(
  "original-shift", input.seed, {}, loadDefaultCybersecurityPack(),
));
beforeEach(() => {
  vi.stubGlobal("sessionStorage", createBrowserStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("recovers a lost creation response using the original stored request and owner", async () => {
  const posts: { body: string | undefined; owner: string | null }[] = [];
  const fetch = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith("/ready")) return Response.json({ status: "ready" });
    posts.push({
      body: typeof options?.body === "string" ? options.body : undefined,
      owner: new Headers(options?.headers).get("Authorization"),
    });
    // Server committed the shift, but the browser lost the first response.
    if (posts.length === 1) throw new TypeError("Response lost");
    return Response.json({ result: { data: { sessionId: view.sessionId, view } } });
  });
  vi.stubGlobal("fetch", fetch);
  await expect(defaultClient.createSession(input)).rejects.toMatchObject({ safeToRetry: true });
  expect(sessionStorage.getItem(PENDING_SESSION_KEY)).toBe("true");
  expect(await defaultClient.createSession(input)).toEqual({ sessionId: view.sessionId, view });
  expect(posts).toEqual(Array.from({ length: 2 }, () => ({
    body: JSON.stringify(input), owner: "Bearer same-owner",
  })));
});

it.each(["missing", "changed", "legacy"])(
  "keeps an unknown pending start paused when request evidence is %s",
  async (evidence) => {
    sessionStorage.setItem(PENDING_SESSION_KEY, "true");
    const key = `career-expo-create:${input.createRequestId}`;
    if (evidence === "changed")
      sessionStorage.setItem(key, JSON.stringify({ ...input, seed: 8 }));
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const attempt = evidence === "legacy"
      ? { seed: input.seed, sessionKind: input.sessionKind, pacingMode: input.pacingMode }
      : input;
    // Repeated reloads must not manufacture proof for a different request.
    for (let index = 0; index < 2; index++)
      await expect(defaultClient.createSession(attempt)).rejects.toMatchObject({
        safeToRetry: false, category: "creation-unconfirmed",
      });
    expect(fetch).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(key)).toBe(evidence === "changed"
      ? JSON.stringify({ ...input, seed: 8 }) : null);
  },
);
