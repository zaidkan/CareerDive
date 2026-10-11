// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { SimulationClient } from "../src/client.js";
import { StartPage } from "../src/site/pages/StartPage.js";
import { LandingPage } from "../src/site/pages/LandingPage.js";
import { SiteApp } from "../src/site/SiteApp.js";

const { createSession } = vi.hoisted(() => ({ createSession: vi.fn() }));
vi.mock("../src/index.js", () => ({
  App: ({ client }: { client?: SimulationClient }) => {
    useEffect(() => {
      if (client) void client.createSession({ seed: 7, sessionKind: "assessed", pacingMode: "standard" });
      else createSession();
    }, [client]);
    return <h1>Floor map ready</h1>;
  },
}));
beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  window.scrollTo = vi.fn();
  createSession.mockClear();
});
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

it("requires an inline Start click on direct entry before creating a session", async () => {
  const client = { createSession } as unknown as SimulationClient;
  render(<StartPage client={client} />);
  expect(createSession).not.toHaveBeenCalled();
  const start = screen.getByRole("button", { name: "Start your first day" });
  expect(start).toHaveAccessibleDescription("By clicking Start, you confirm you're 13 or older and agree to our Terms and Privacy Policy .");
  expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
  fireEvent.click(start);
  await screen.findByRole("heading", { name: "Floor map ready" });
  expect(createSession).toHaveBeenCalledTimes(1);
});

it("homepage Start acknowledges its adjacent notice and proceeds without another gate", async () => {
  const { unmount, container } = render(<LandingPage />);
  const hero = container.querySelector(".home-hero");
  if (!(hero instanceof HTMLElement)) throw new Error("Hero missing");
  const start = within(hero).getByRole("link", { name: /Start your first day/ });
  expect(start).toHaveAccessibleDescription("By clicking Start, you confirm you're 13 or older and agree to our Terms and Privacy Policy .");
  fireEvent.click(start);
  expect(window.location.pathname).toBe("/start");
  unmount();
  render(<StartPage client={{ createSession } as unknown as SimulationClient} />);
  await screen.findByRole("heading", { name: "Floor map ready" });
  expect(screen.queryByRole("button", { name: "Start your first day" })).toBeNull();
  expect(createSession).toHaveBeenCalledTimes(1);
});

it("header Start and legacy arrival markers cannot bypass the acknowledgment", async () => {
  window.sessionStorage.setItem("first-shift-start-gate", "sim");
  render(<SiteApp />);
  const nav = screen.getByRole("banner");
  fireEvent.click(within(nav).getByRole("link", { name: /Continue|Start your first day/ }));
  await screen.findByRole("button", { name: "Start your first day" });
  expect(createSession).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("main")).getByRole("link", { name: "Terms" }));
  await waitFor(() => {
    expect(window.location.pathname).toBe("/terms");
  });
  expect(createSession).not.toHaveBeenCalled();
});
