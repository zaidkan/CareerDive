// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
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
  vi.restoreAllMocks();
});
function production() {
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_SUPABASE_URL", "https://offline.invalid");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "sb_publishable_offline");
}
function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error("Auth cancelled");
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

it("aborts stalled auth transport, releases single-flight and preserves caller cancellation", async () => {
  production();
  const deadline = new AbortController();
  const timeout = vi
    .spyOn(AbortSignal, "timeout")
    .mockReturnValue(deadline.signal);
  const fetchMock = vi.fn(
    (_input: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) throw new Error("Auth fetch must have a deadline");
        if (signal.aborted) reject(abortError(signal));
        else
          signal.addEventListener(
            "abort",
            () => {
              reject(abortError(signal));
            },
            {
              once: true,
            },
          );
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  auth.getSession.mockImplementationOnce(async () => {
    const authFetch = vi.mocked(createClient).mock.calls[0]?.[2]?.global?.fetch;
    if (!authFetch) throw new Error("Auth fetch missing");
    await authFetch("https://offline.invalid/auth/v1/token");
    throw new Error("Unexpected response");
  });
  const { authHeaders } = await import("../src/transport.js");
  const failed = Array.from({ length: 8 }, () => authHeaders());
  const settled = Promise.allSettled(failed);
  await vi.waitFor(() => {
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  expect(timeout).toHaveBeenCalledWith(5000);
  deadline.abort(new Error("Auth deadline reached"));
  expect((await settled).every((result) => result.status === "rejected")).toBe(
    true,
  );
  auth.getSession.mockResolvedValue({
    data: {
      session: { access_token: "restored-owner", expires_at: 9999999999 },
    },
    error: null,
  });
  expect(await authHeaders()).toEqual({
    Authorization: "Bearer restored-owner",
  });
  expect(auth.signInAnonymously).not.toHaveBeenCalled();
  const authFetch = vi.mocked(createClient).mock.calls[0]?.[2]?.global?.fetch;
  if (!authFetch) throw new Error("Auth fetch missing");
  timeout.mockReturnValue(new AbortController().signal);
  const caller = new AbortController();
  const cancelled = authFetch("https://offline.invalid/auth/v1/token", {
    signal: caller.signal,
  });
  const rejected = expect(cancelled).rejects.toThrow("Caller cancelled");
  caller.abort(new Error("Caller cancelled"));
  await rejected;
});

it("times out waiting for another tab's identity lock and allows a later retry", async () => {
  production();
  const deadline = new AbortController();
  const timeout = vi
    .spyOn(AbortSignal, "timeout")
    .mockReturnValue(deadline.signal);
  const request = vi.fn(
    (_name: string, options: { signal: AbortSignal }, callback: unknown) =>
      new Promise((_resolve, reject) => {
        void callback;
        options.signal.addEventListener(
          "abort",
          () => {
            reject(abortError(options.signal));
          },
          { once: true },
        );
      }),
  );
  vi.stubGlobal("navigator", { locks: { request } });
  const { authHeaders } = await import("../src/transport.js");
  const headers = authHeaders();
  const rejected = expect(headers).rejects.toThrow("Lock deadline reached");
  expect(timeout).toHaveBeenCalledWith(8000);
  deadline.abort(new Error("Lock deadline reached"));
  await rejected;
  expect(auth.getSession).not.toHaveBeenCalled();
  request.mockImplementationOnce(async (_name, _options, callback) =>
    (callback as () => Promise<Record<string, string>>)(),
  );
  auth.getSession.mockResolvedValue({
    data: {
      session: { access_token: "original-owner", expires_at: 9999999999 },
    },
    error: null,
  });
  expect(await authHeaders()).toEqual({
    Authorization: "Bearer original-owner",
  });
});
