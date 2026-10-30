import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

it("warms the readiness endpoint once without creating a session", async () => {
  const fetchMock = vi.fn(() => new Promise<Response>(() => undefined));
  vi.stubGlobal("fetch", fetchMock);
  const { warmApiServer } = await import("../src/site/apiWarmup.js");

  warmApiServer();
  warmApiServer();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/ready$/),
    expect.objectContaining({
      cache: "no-store",
      credentials: "omit",
    }),
  );
});
