// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createHash } from "node:crypto";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SiteApp } from "../src/site/SiteApp.js";
import privacy from "../src/site/legal/privacy.md?raw";
import terms from "../src/site/legal/terms.md?raw";

afterEach(cleanup);
it.each([
  ["/privacy", "CareerDive Privacy Policy", privacy, "11594dd25c1de778b14deace4e6cf9b90978a5ee8e8a190d6a824e2b91d58d9b", 9],
  ["/terms", "CareerDive Terms of Use", terms, "85a2f66e7d5f9dd18fdab95cfb9164afceb7809516309bbf0231fc262e7825ea", 8],
] as const)("renders %s from approved source wording without creating an identity", async (route, title, source, hash, sections) => {
  const fetch = vi.spyOn(globalThis, "fetch");
  try {
    expect(createHash("sha256").update(source).digest("hex")).toBe(hash);
    render(<SiteApp initialRoute={route} />);
    expect(await screen.findByRole("heading", { name: title })).toBeVisible();
    const main = screen.getByRole("main");
    expect(within(main).getAllByRole("heading", { level: 2 })).toHaveLength(sections);
    expect(main).toHaveTextContent("Last updated: October 11, 2026");
    for (const paragraph of source.split(/\n\s*\n/).filter((p) => !p.startsWith("#") && !p.startsWith("-"))) {
      const text = paragraph.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
      expect(main).toHaveTextContent(text);
    }
    for (const link of within(main).getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toMatch(/\.md$/);
    }
    const footer = screen.getByRole("navigation", { name: "Footer" });
    expect(within(footer).getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(within(footer).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    fetch.mockRestore();
  }
});
