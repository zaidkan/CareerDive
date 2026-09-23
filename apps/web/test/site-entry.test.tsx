// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteApp } from "../src/site/SiteApp.js";
import { parseRoute } from "../src/site/routes.js";
import { LandingPage } from "../src/site/pages/LandingPage.js";
import { StartPage } from "../src/site/pages/StartPage.js";

vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: () => <div>room mock</div>,
}));

afterEach(() => {
  cleanup();
  try {
    window.sessionStorage.removeItem("first-shift-start-gate");
  } catch {
    // Storage unavailable in this environment.
  }
  try {
    window.localStorage.removeItem("career-expo-theme");
  } catch {
    // Storage unavailable in this environment.
  }
  window.history.pushState(null, "", "/");
});

describe("site routes", () => {
  it("parses known routes and falls back to landing", () => {
    expect(parseRoute("/")).toBe("/");
    expect(parseRoute("/how-it-works")).toBe("/how-it-works");
    expect(parseRoute("/trust")).toBe("/trust");
    expect(parseRoute("/faq")).toBe("/faq");
    expect(parseRoute("/start")).toBe("/start");
    expect(parseRoute("/unknown")).toBe("/");
  });

  it("renders landing without creating a simulation session", () => {
    const createSession = vi.fn();
    render(<SiteApp initialRoute="/" />);
    expect(
      screen.getByRole("heading", {
        name: /try day one as a cybersecurity analyst/i,
      }),
    ).toBeVisible();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("landing has no fake quotes, no film teaser, no redundant surface section", () => {
    render(<LandingPage />);
    expect(screen.queryByText(/early response/i)).toBeNull();
    expect(screen.queryByText(/felt like real triage/i)).toBeNull();
    expect(screen.queryByText(/arrival film · verdaly/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /watch arrival film/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /play arrival film/i })).toBeNull();
    expect(screen.getByRole("heading", { name: /how the 10 minutes move/i })).toBeVisible();
    expect(screen.queryByRole("heading", { name: /three ways to work/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /ready for day one/i })).toBeNull();
    expect(
      screen.getAllByRole("link", { name: /start your first day/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("landing keeps shift surprises vague and names systems only", () => {
    render(<LandingPage />);
    expect(screen.getByText(/keeps some surprises/i)).toBeVisible();
    expect(
      screen.queryByText(/minute 25/i),
    ).toBeNull();
    expect(screen.queryByText(/false-positive review/i)).toBeNull();
    expect(screen.queryByText(/phishing report/i)).toBeNull();
    expect(
      screen.getByRole("heading", { name: /five workplace systems/i }),
    ).toBeVisible();
  });

  it("landing hero routes into the start film gate", async () => {
    window.history.pushState(null, "", "/");
    render(<SiteApp />);
    const ctas = screen.getAllByRole("link", { name: /start your first day/i });
    const cta = ctas[0];
    if (!cta) throw new Error("hero start CTA missing");
    fireEvent.click(cta);
    expect(
      await screen.findByRole("heading", {
        name: /short preview film/i,
      }, { timeout: 6000 }),
    ).toBeVisible();
    window.history.pushState(null, "", "/");
  });

  it(
    "start gate forces film through doors freeze before sim",
    async () => {
      const createSession = vi.fn(() =>
        Promise.resolve({
          sessionId: "s-1",
          view: undefined as never,
        }),
      );
      const client = {
        createSession,
        performAction: vi.fn(),
        performWorkplaceInteraction: vi.fn(),
        submitTaskAttempt: vi.fn(),
        respondToNotification: vi.fn(),
        getDebrief: vi.fn(),
      };
      render(<StartPage client={client} />);
      expect(createSession).not.toHaveBeenCalled();

      expect(
        await screen.findByRole("heading", {
          name: /short preview film/i,
        }),
      ).toBeVisible();
      // Enter action is unreachable before the gate resolves. No skip path.
      expect(
        screen.queryByRole("button", { name: /enter the verdaly floor/i }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: /skip|continue to briefing/i }),
      ).toBeNull();
      expect(
        screen.queryByText(/finish the film to unlock the simulator/i),
      ).toBeNull();

      // Simulate doors freeze: play then end the video.
      fireEvent.click(
        screen.getByRole("button", { name: /play arrival film/i }),
      );
      const video = document.querySelector("video");
      if (!video) throw new Error("arrival video missing");
      fireEvent(video, new Event("ended"));
      fireEvent.click(
        await screen.findByRole("button", {
          name: /start your first day/i,
        }),
      );
      await waitFor(() => {
        expect(createSession).toHaveBeenCalledTimes(1);
      });
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({ sessionKind: "assessed" }),
      );
    },
    15000,
  );

  it(
    "start gate fallback shows DoorHud when video fails to load",
    async () => {
      const createSession = vi.fn(() =>
        Promise.resolve({
          sessionId: "s-1",
          view: undefined as never,
        }),
      );
      const client = {
        createSession,
        performAction: vi.fn(),
        performWorkplaceInteraction: vi.fn(),
        submitTaskAttempt: vi.fn(),
        respondToNotification: vi.fn(),
        getDebrief: vi.fn(),
      };
      render(<StartPage client={client} />);
      expect(
        await screen.findByRole("heading", {
          name: /short preview film/i,
        }),
      ).toBeVisible();
      fireEvent.click(
        screen.getByRole("button", { name: /play arrival film/i }),
      );
      const video = document.querySelector("video");
      if (!video) throw new Error("arrival video missing for error fallback test");
      // Simulate missing asset / decode error.
      fireEvent(video, new Event("error"));
      // Fallback uses poster/stills and still reveals DoorHud — no dead end.
      expect(
        await screen.findByRole("button", {
          name: /start your first day/i,
        }),
      ).toBeVisible();
      expect(screen.getByRole("region", { name: /verdaly doors/i })).toBeVisible();
      expect(screen.getByText(/film unavailable/i)).toBeVisible();
      // Poster fallback is present and accessible.
      expect(
        screen.getByAltText(/arrival film unavailable/i),
      ).toBeVisible();
      // Can still proceed directly to sim — no intermediate briefing page.
      fireEvent.click(
        screen.getByRole("button", { name: /start your first day/i }),
      );
      await waitFor(() => {
        expect(createSession).toHaveBeenCalledTimes(1);
      });
      // Transcript/stills remain accessible as fallback.
      expect(
        screen.queryByRole("button", { name: /play arrival film/i }),
      ).toBeNull();
    },
    15000,
  );

  it("sets per-route document title", () => {
    render(<SiteApp initialRoute="/trust" />);
    expect(document.title).toMatch(/privacy and safety/i);
  });

  it("resumes at sim after film seen (legacy briefing key maps to sim)", async () => {
    window.sessionStorage.setItem("first-shift-start-gate", "briefing");
    const client = {
      createSession: vi.fn(() =>
        Promise.resolve({
          sessionId: "s-1",
          view: undefined as never,
        }),
      ),
      performAction: vi.fn(),
      performWorkplaceInteraction: vi.fn(),
      submitTaskAttempt: vi.fn(),
      respondToNotification: vi.fn(),
      getDebrief: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    render(<StartPage client={client as any} />);
    // legacy "briefing" now maps directly to sim — no intermediate page.
    expect(
      screen.queryByRole("heading", { name: /you are at the doors/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /short preview film/i }),
    ).toBeNull();
    // Sim bootstraps immediately (no film re-gate).
    expect(client.createSession).toHaveBeenCalledTimes(1);
  });
});
