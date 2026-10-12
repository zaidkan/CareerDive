// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteApp } from "../src/site/SiteApp.js";
import { parseRoute } from "../src/site/routes.js";
import { LandingPage } from "../src/site/pages/LandingPage.js";
import { HttpSimulationClient } from "../src/client.js";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { StartPage } from "../src/site/pages/StartPage.js";

vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: () => <div>room mock</div>,
}));

const entryView = toClientView(
  createInitialWorldState("s-1", 7, {}, loadDefaultCybersecurityPack()),
);

beforeEach(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  try {
    window.sessionStorage.removeItem("first-shift-start-gate");
    window.sessionStorage.removeItem("careerdive-start-consent");
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
  it("parses known routes and represents unknown paths explicitly", () => {
    expect(parseRoute("/")).toEqual({ kind: "home" });
    expect(parseRoute("/careers")).toEqual({ kind: "careers" });
    expect(parseRoute("/careers/")).toEqual({ kind: "careers" });
    expect(parseRoute("/careers/cybersecurity-analyst")).toEqual({
      kind: "career",
      slug: "cybersecurity-analyst",
    });
    expect(parseRoute("/careers/cybersecurity-analyst/")).toEqual({
      kind: "career",
      slug: "cybersecurity-analyst",
    });
    expect(parseRoute("/careers/registered-nurse")).toEqual({
      kind: "not-found",
      pathname: "/careers/registered-nurse",
    });
    expect(parseRoute("/careers/missing")).toEqual({
      kind: "not-found",
      pathname: "/careers/missing",
    });
    expect(parseRoute("/how-it-works")).toEqual({ kind: "how-it-works" });
    expect(parseRoute("/trust")).toEqual({ kind: "trust" });
    expect(parseRoute("/faq")).toEqual({ kind: "faq" });
    expect(parseRoute("/start")).toEqual({ kind: "start" });
    expect(parseRoute("/unknown")).toEqual({
      kind: "not-found",
      pathname: "/unknown",
    });
  });

  it("renders landing without creating a simulation session", () => {
    const createSession = vi.spyOn(
      HttpSimulationClient.prototype,
      "createSession",
    );
    render(<SiteApp initialRoute="/" />);
    expect(
      screen.getByRole("heading", {
        name: /try a slice of the work\. see how you'd make the call/i,
      }),
    ).toBeVisible();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("does not place a visible focus ring on the first direct page load", () => {
    render(<SiteApp />);
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveFocus();
  });

  it("defers launch media until interaction and keeps playback manual", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { name: "Watch the launch film." }),
    ).toBeVisible();
    for (const chapter of ["home-shift", "home-launch", "home-reflect"]) {
      expect(document.querySelector(`.${chapter}-chapter`)).toHaveClass(
        "ui-surface--base",
      );
    }
    const video = screen.getByLabelText("CareerDive launch film");
    expect(video).toHaveAttribute("preload", "none");
    expect(video).toHaveAttribute("controls");
    expect(video).not.toHaveAttribute("autoplay");
    expect(video).not.toHaveAttribute("src");
    expect(video).not.toHaveAttribute("poster");
    expect(video).toHaveAttribute("width", "1920");
    expect(video).toHaveAttribute("height", "1080");
    fireEvent.focus(video);
    expect(video).toHaveAttribute("src", "/launch-film.mp4");
    expect(video).toHaveAttribute("poster", "/launch-film-poster.jpg");
    expect(video).toHaveAttribute("preload", "none");
    expect(video).not.toHaveAttribute("autoplay");
  });

  it("landing presents the full career journey without fake proof", () => {
    render(<LandingPage />);
    expect(screen.queryByText(/early response/i)).toBeNull();
    expect(screen.queryByText(/felt like real triage/i)).toBeNull();
    expect(screen.queryByText(/arrival film · verdaly/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /watch arrival film/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /play arrival film/i }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", {
        name: /^your decisions change the case\.$/i,
      }),
    ).toBeVisible();
    expect(
      screen.getAllByText("One playable now. Four taking shape."),
    ).toHaveLength(1);
    expect(document.querySelector(".home-careers")).toBeNull();
    expect(document.querySelector(".home-place")?.nextElementSibling).toBe(
      document.querySelector(".home-realwork"),
    );
    expect(document.querySelectorAll(".home-decision-beats li")).toHaveLength(
      3,
    );
    expect(
      screen.getByText("And some consequences surface later in your shift."),
    ).toBeVisible();
    expect(
      Array.from(document.querySelectorAll(".home-decision-beats li")).map(
        (beat) => beat.textContent,
      ),
    ).toEqual([
      "Make the call — escalate, dismiss, or route.",
      "The outcome follows from what you chose.",
      "And some consequences surface later in your shift.",
    ]);
    expect(
      screen.getByRole("heading", {
        name: "How a shift works",
      }),
    ).toBeVisible();
    expect(document.querySelector(".home-realwork figure")).toBeNull();
    expect(document.querySelector(".home-realwork button")).toBeNull();
    expect(
      document.querySelector(".home-realwork [data-media-slot]"),
    ).toBeNull();
    expect(
      screen.getAllByText(/actual product capture/i).length,
    ).toBeGreaterThanOrEqual(1);
    // Deterministic media slots stay stable for the real-media pipeline.
    for (const slot of ["home-hero-workplace", "home-debrief-reflection"]) {
      expect(
        document.querySelector(`[data-media-slot="${slot}"]`),
      ).not.toBeNull();
    }
    // Hero visual is the compact career-card system, not a static thumbnail.
    expect(document.querySelectorAll(".home-hero-card")).toHaveLength(5);
    expect(document.querySelector(".home-hero-stage img")).toBeNull();
    // How a shift works stays text-only; the redundant handoff preview is gone.
    expect(document.querySelector(".home-desk")).toBeNull();
    expect(document.querySelector(".home-handoff")).toBeNull();
    expect(
      screen.queryByText("Your shift ends. The work does not."),
    ).toBeNull();
    expect(
      document.querySelectorAll('[data-media-slot="home-debrief-reflection"]'),
    ).toHaveLength(1);
    expect(
      Array.from(document.querySelectorAll(".v2-home > section")).map(
        (section) => section.className,
      ),
    ).toEqual([
      "home-hero",
      "home-place",
      "home-realwork",
      "home-analysis",
      "home-shift",
      "home-launch",
      "home-reflect",
      "home-faq",
    ]);
    expect(
      screen.getByRole("heading", { name: "An honest review, not a score." }),
    ).toBeVisible();
    expect(document.querySelector(".home-reflect-chapter")).toHaveClass(
      "ui-width--wide",
    );
    expect(
      screen.getByText(
        "What felt interesting? What felt difficult? Use this shift to explore those questions—not as a career verdict.",
      ),
    ).toBeVisible();
    expect(document.querySelectorAll(".home-analysis-beats li")).toHaveLength(
      3,
    );
    expect(
      document.querySelectorAll('[data-media-slot^="career-artifact-"]'),
    ).toHaveLength(0);
    // The old third career presentation is gone from home.
    expect(
      screen.queryByRole("heading", {
        name: "Which career do you want to try?",
      }),
    ).toBeNull();
    expect(screen.queryByText(/requests stay on this page/i)).toBeNull();
    expect(
      screen.queryByRole("heading", {
        name: "Try a shift. See how you reasoned.",
      }),
    ).toBeNull();
    expect(document.querySelector(".home-final")).toBeNull();
    expect(document.querySelectorAll(".v2-home .start-cta")).toHaveLength(1);
    const hero = document.querySelector(".home-hero");
    if (!hero) throw new Error("Missing hero");
    expect(within(hero as HTMLElement).getByRole("link", { name: /Start your first day/ })).toHaveAttribute("href", "/start");
    expect(within(hero as HTMLElement).getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(within(hero as HTMLElement).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(
      screen.getByRole("heading", { name: /questions, answered plainly/i }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: /start your first day/i }).length,
    ).toBeGreaterThanOrEqual(1);
    // CTA hierarchy: start is primary; explore stays secondary.
    expect(
      screen.getAllByRole("link", { name: /career and previews/i }).length,
    ).toBeGreaterThan(0);
  });

  it("keeps one hero CTA pair without a stray status button", () => {
    render(<LandingPage />);
    const hero = document.querySelector(".home-hero");
    expect(hero?.querySelectorAll('a[href="/start"]')).toHaveLength(1);
    expect(hero?.querySelectorAll('a[href="/careers"]')).toHaveLength(1);
    expect(hero?.querySelector("button[disabled]")).toBeNull();
    const nurse = screen.getByRole("button", {
      name: /registered nurse.*taking shape/i,
    });
    fireEvent.click(nurse);
    expect(nurse).toHaveAttribute("aria-pressed", "true");
    expect(hero?.querySelector("button[disabled]")).toBeNull();
    expect(
      document.querySelector(
        '.home-hero-card[data-emphasis="true"] .home-hero-card-status',
      ),
    ).toHaveTextContent("Taking shape");
  });

  it("keeps a static, selectable stack when reduced motion is requested", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    try {
      render(<LandingPage />);
      vi.advanceTimersByTime(24000);
      const cyber = screen.getByRole("button", {
        name: /cybersecurity analyst.*playable now/i,
      });
      const nurse = screen.getByRole("button", {
        name: /registered nurse.*taking shape/i,
      });
      expect(cyber).toHaveAttribute("aria-pressed", "true");
      fireEvent.focus(nurse);
      vi.advanceTimersByTime(24000);
      expect(nurse).toHaveAttribute("aria-pressed", "true");
      expect(cyber).toHaveAttribute("aria-pressed", "false");
    } finally {
      cleanup();
      vi.restoreAllMocks();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it("landing names verified shift moments without invented scoring or urgency", () => {
    render(<LandingPage />);
    expect(screen.queryByText(/minute 25/i)).toBeNull();
    expect(screen.queryByText(/false-positive review/i)).toBeNull();
    expect(screen.queryByText(/phishing report/i)).toBeNull();
    expect(
      screen.queryByText(/leaderboard|most requested|points|streak/i),
    ).toBeNull();
  });

  it("landing gives every career visual presence and honest workshop labels", () => {
    render(<LandingPage />);
    for (const title of [
      "Cybersecurity Analyst",
      "Registered Nurse",
      "Mechanical Engineer",
      "Electrician",
      "Lawyer / Attorney",
    ]) {
      expect(screen.getAllByText(title).length).toBeGreaterThanOrEqual(1);
    }
    // One career deck; each selection announces its real availability.
    expect(
      screen.getAllByRole("button", { name: /taking shape/i }),
    ).toHaveLength(4);
    expect(
      screen.getByRole("button", {
        name: /cybersecurity analyst.*playable now/i,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    const heroCards = Array.from(
      document.querySelectorAll(".home-hero-card .home-hero-card-name"),
    );
    expect(heroCards[0]?.textContent).toBe("Cybersecurity Analyst");
    expect(screen.getAllByText(/playable now/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/^your decisions change the case\.$/i),
    ).toBeInTheDocument();
  });

  it("landing hero routes directly to the floor map", async () => {
    vi.spyOn(HttpSimulationClient.prototype, "createSession").mockResolvedValue(
      { sessionId: "s-1", view: entryView },
    );
    window.history.pushState(null, "", "/");
    render(<SiteApp />);
    const cta = document.querySelector<HTMLAnchorElement>('.home-hero a[href="/start"]');
    if (!cta) throw new Error("hero start CTA missing");
    fireEvent.click(cta);
    expect(
      await screen.findByRole(
        "heading",
        {
          name: /head to security operations/i,
        },
        { timeout: 6000 },
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /continue to floor/i }),
    ).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Threshold" })).toBeNull();
    expect(document.querySelector('video[src="/arrival-film.mp4"]')).toBeNull();
    const laterHeading = document.createElement("h1");
    laterHeading.textContent = "Later simulation heading";
    document.getElementById("main-content")?.appendChild(laterHeading);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(laterHeading).not.toHaveFocus();
    window.history.pushState(null, "", "/");
  });

  it("opens the floor map and creates exactly one assessed session", async () => {
    const createSession = vi.fn(() =>
      Promise.resolve({ sessionId: "s-1", view: entryView }),
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
    fireEvent.click(screen.getByRole("button", { name: "Start your first day" }));
    expect(
      await screen.findByRole("heading", {
        name: /head to security operations/i,
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /continue to floor/i }),
    ).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Threshold" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /play arrival film/i }),
    ).toBeNull();
    expect(document.querySelector('video[src="/arrival-film.mp4"]')).toBeNull();
    await waitFor(() => {
      expect(createSession).toHaveBeenCalledTimes(1);
    });
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({ sessionKind: "assessed" }),
    );
  });

  it("maps the old film gate to the floor without upfront media", async () => {
    window.sessionStorage.setItem("first-shift-start-gate", "film");
    const createSession = vi
      .fn()
      .mockResolvedValue({ sessionId: "s-1", view: entryView });
    const client = {
      createSession,
      performAction: vi.fn(),
      performWorkplaceInteraction: vi.fn(),
      submitTaskAttempt: vi.fn(),
      respondToNotification: vi.fn(),
      getDebrief: vi.fn(),
    };
    render(<StartPage client={client} />);
    fireEvent.click(screen.getByRole("button", { name: "Start your first day" }));
    expect(
      await screen.findByRole("heading", {
        name: /head to security operations/i,
      }),
    ).toBeVisible();
    expect(document.querySelector('video[src="/arrival-film.mp4"]')).toBeNull();
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it("sets per-route document title", () => {
    render(<SiteApp initialRoute="/trust" />);
    expect(document.title).toBe("Privacy and safety · CareerDive");
  });

  it("resumes at sim after film seen (legacy briefing key maps to sim)", async () => {
    window.sessionStorage.setItem("first-shift-start-gate", "briefing");
    const client = {
      createSession: vi.fn(() =>
        Promise.resolve({
          sessionId: "s-1",
          view: entryView,
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
    fireEvent.click(screen.getByRole("button", { name: "Start your first day" }));
    // legacy "briefing" now maps directly to sim — no intermediate page.
    expect(
      screen.queryByRole("heading", { name: /you are at the doors/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /short preview film/i }),
    ).toBeNull();
    await screen.findByRole("heading", {
      name: /head to security operations/i,
    });
    // Sim bootstraps immediately (no film re-gate).
    expect(client.createSession).toHaveBeenCalledTimes(1);
  });
});
