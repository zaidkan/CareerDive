// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SiteApp } from "../src/site/SiteApp.js";
import { navigate } from "../src/site/routes.js";

const { launchEvent } = vi.hoisted(() => ({ launchEvent: vi.fn() }));
vi.mock("../src/analytics.js", () => ({ launchEvent }));

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  window.scrollTo = vi.fn();
  launchEvent.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  window.history.replaceState(null, "", "/");
});

it("wakes the API while browsing without authentication or session creation", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json({ status: "ready" }));
  vi.stubGlobal("fetch", fetch);
  render(<StrictMode><SiteApp /></StrictMode>);
  await waitFor(() => { expect(fetch).toHaveBeenCalled(); });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]?.[0]).toMatch(/\/ready$/);
  expect(fetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
});

it("keeps public pages usable without collecting disabled analytics", async () => {
  vi.stubEnv("VITE_LAUNCH_ANALYTICS_ENABLED", "false");
  render(<SiteApp />);
  act(() => {
    navigate("/faq");
  });
  expect(await screen.findByRole("heading", { level: 1 })).toBeVisible();
  expect(launchEvent).not.toHaveBeenCalled();
});

it("preserves landing and career events when deferred analytics is enabled", async () => {
  vi.stubEnv("VITE_LAUNCH_ANALYTICS_ENABLED", "true");
  render(<SiteApp />);
  await waitFor(() => {
    expect(launchEvent).toHaveBeenCalledWith("landing");
  });
  act(() => {
    navigate("/careers/cybersecurity-analyst");
  });
  await waitFor(() => {
    expect(launchEvent).toHaveBeenCalledWith(
      "career_viewed",
      "cybersecurity-analyst",
    );
  });
  expect(await screen.findByRole("heading", { level: 1 })).toHaveFocus();
});

it("keeps route content available if best-effort analytics fails", async () => {
  vi.stubEnv("VITE_LAUNCH_ANALYTICS_ENABLED", "true");
  launchEvent.mockImplementation(() => {
    throw new Error("Analytics unavailable");
  });
  render(<SiteApp />);
  await waitFor(() => {
    expect(launchEvent).toHaveBeenCalledWith("landing");
  });
  expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
});
