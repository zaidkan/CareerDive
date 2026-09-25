// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { careers, careerPath, getCareerBySlug } from "../src/careers/careers.js";
import { readyNowCareers, workshopCareers } from "../src/careers/selectors.js";
import type { PublicCareer } from "../src/careers/types.js";
import { SiteApp } from "../src/site/SiteApp.js";
import { CareerCard } from "../src/site/careers/CareerCard.js";
import { WorkshopShelf } from "../src/site/careers/WorkshopShelf.js";

beforeEach(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

function careerAt(index: number, items: readonly PublicCareer[] = careers): PublicCareer {
  const career = items[index];
  if (!career) throw new Error(`Missing career fixture at ${String(index)}`);
  return career;
}

function detailHeader(): HTMLElement {
  const header = document.querySelector("main header");
  if (!(header instanceof HTMLElement)) throw new Error("Career detail header missing");
  return header;
}

describe("public career data", () => {
  it("keeps unique public slugs and explicit simulation destinations", () => {
    expect(new Set(careers.map((career) => career.slug)).size).toBe(careers.length);
    expect(careers.every((career) => ["ready_now", "in_workshop"].includes(career.availability))).toBe(true);
    expect(readyNowCareers().map((career) => [career.slug, career.simulationRoute])).toEqual([
      ["cybersecurity-analyst", "/start"],
    ]);
    expect(workshopCareers().every((career) => !career.simulationRoute)).toBe(true);
    expect(workshopCareers().every((career) => !career.detailPublished)).toBe(true);
    expect(readyNowCareers().every((career) => career.detailPublished)).toBe(true);
    expect(workshopCareers().every((career) => career.contentCaveats?.length)).toBe(true);
    expect(careerPath(careerAt(0))).toBe("/careers/cybersecurity-analyst");
    expect(getCareerBySlug("cybersecurity-analyst")?.title).toBe("Cybersecurity Analyst");
  });

  it("renders an arbitrary reordered Workshop fixture without position rules", () => {
    const original = workshopCareers();
    const reordered: PublicCareer[] = original.slice(0, 3).reverse();
    const { rerender } = render(<WorkshopShelf careers={reordered} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(reordered.map((career) => career.title));
    rerender(<WorkshopShelf careers={[
      ...reordered,
      { ...careerAt(0, reordered), id: "extra-one", slug: "extra-one", title: "Extra career one" },
      { ...careerAt(1, reordered), id: "extra-two", slug: "extra-two", title: "Extra career two" },
    ]} />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(5);
    expect(screen.getByRole("heading", { name: "Extra career two" })).toBeVisible();
  });
});

describe("Career Explorer interaction", () => {
  it("shows Ready Now and Workshop with useful content and no carousel", async () => {
    render(<SiteApp initialRoute="/careers" />);
    expect(await screen.findByRole("heading", { name: "Ready Now" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "In the Workshop" })).toBeVisible();
    expect(screen.getByText(careerAt(0).shortSummary)).toBeVisible();
    expect(screen.getByText(careerAt(1).shortSummary)).toBeVisible();
    expect(screen.queryByRole("button", { name: /previous|next slide/i })).toBeNull();
    expect(screen.queryByRole("region", { name: /carousel/i })).toBeNull();
    expect(screen.queryByText(/students requested|requests this month/i)).toBeNull();
  });

  it("opens and closes explicit inline Preview from keyboard", async () => {
    const user = userEvent.setup();
    const career = careerAt(1);
    const task = career.plannedTasks[0];
    if (!task) throw new Error("Career preview task missing");
    render(<CareerCard career={career} />);
    const button = screen.getByRole("button", { name: "Preview Registered Nurse" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    button.focus();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(task)).toBeVisible();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(task)).not.toBeVisible();
  });

  it("sends reversible desired request states without a count", async () => {
    const user = userEvent.setup();
    const setCareerRequest = vi.fn();
    render(<CareerCard career={careerAt(1)} setCareerRequest={setCareerRequest} />);
    const button = screen.getByRole("button", { name: "Request Registered Nurse" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(setCareerRequest).toHaveBeenLastCalledWith({ careerId: "registered-nurse", requested: true });
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(setCareerRequest).toHaveBeenLastCalledWith({ careerId: "registered-nurse", requested: false });
    expect(screen.queryByText(/\b\d+ requests\b/i)).toBeNull();
  });

  it("keeps local demo state visibly marked as uncollected", async () => {
    const user = userEvent.setup();
    render(<CareerCard career={careerAt(1)} />);
    await user.click(screen.getByRole("button", { name: "Request Registered Nurse" }));
    expect(screen.getByText(/requests are not collected yet/i)).toBeVisible();
  });
});

describe("public routes", () => {
  it("navigates through browser history, focuses headings, and makes no session request", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    window.history.replaceState(null, "", "/");
    render(<SiteApp />);
    const primary = screen.getByRole("navigation", { name: "Primary" });
    await user.click(within(primary).getByRole("link", { name: "Careers" }));
    expect(await screen.findByRole("heading", { name: "Explore careers through the work" })).toHaveFocus();
    expect(within(primary).getByRole("link", { name: "Careers" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("link", { name: "Cybersecurity Analyst details" }));
    expect(await screen.findByRole("heading", { name: "Cybersecurity Analyst", level: 1 })).toHaveFocus();
    expect(window.location.pathname).toBe("/careers/cybersecurity-analyst");
    window.history.back();
    await waitFor(() => { expect(window.location.pathname).toBe("/careers"); });
    expect(await screen.findByRole("heading", { name: "Explore careers through the work" })).toHaveFocus();
    window.history.forward();
    await waitFor(() => { expect(window.location.pathname).toBe("/careers/cybersecurity-analyst"); });
    expect(await screen.findByRole("heading", { name: "Cybersecurity Analyst", level: 1 })).toHaveFocus();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("published detail uses canonical data and its explicit simulation route", async () => {
    render(<SiteApp initialRoute="/careers/cybersecurity-analyst" />);
    expect(await screen.findByRole("heading", { name: careerAt(0).title, level: 1 })).toBeVisible();
    expect(within(detailHeader()).getByText(careerAt(0).workplaceSummary)).toBeVisible();
    expect(screen.getByRole("link", { name: "Begin your first day" })).toHaveAttribute("href", "/start");
  });

  it("keeps Workshop details unpublished and cards on the Explorer", async () => {
    render(<CareerCard career={careerAt(1)} />);
    expect(screen.queryByRole("link", { name: "Registered Nurse details" })).toBeNull();
    expect(screen.getByRole("button", { name: "Preview Registered Nurse" })).toBeVisible();
    cleanup();
    render(<SiteApp initialRoute="/careers/registered-nurse" />);
    expect(await screen.findByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Begin your first day" })).toBeNull();
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
  });

  it.each(["/careers/missing", "/not-a-page"])("renders 404 for %s", async (path) => {
    window.history.replaceState(null, "", path);
    render(<SiteApp />);
    expect(await screen.findByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Explore careers" })).toHaveAttribute("href", "/careers");
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
  });
});

describe("public page accessibility", () => {
  it.each(["/careers", "/careers/cybersecurity-analyst", "/careers/registered-nurse", "/careers/missing"])("passes axe at %s", async (path) => {
    window.history.replaceState(null, "", path);
    const { container } = render(<SiteApp />);
    await screen.findByRole("heading", { level: 1 });
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
