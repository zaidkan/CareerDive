// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SiteApp } from "../src/site/SiteApp.js";
import privacy from "../src/site/legal/privacy.md?raw";
import terms from "../src/site/legal/terms.md?raw";

afterEach(cleanup);
it.each([
  ["/privacy", "CareerDive Privacy Policy", privacy, "d4c0ff4ea5f6490813f51246c36294a7d0261b3d55f84faa73a8270a2c9452a1", 9, "October 12, 2026", "PRIVACY-POLICY.md"],
  ["/terms", "CareerDive Terms of Use", terms, "85a2f66e7d5f9dd18fdab95cfb9164afceb7809516309bbf0231fc262e7825ea", 8, "October 11, 2026", "TERMS.md"],
] as const)("renders %s from approved source wording without creating an identity", async (route, title, source, hash, sections, updated, filename) => {
  const fetch = vi.spyOn(globalThis, "fetch");
  try {
    expect(createHash("sha256").update(source).digest("hex")).toBe(hash);
    expect(readFileSync(`docs/planning/${filename}`, "utf8")).toBe(source);
    render(<SiteApp initialRoute={route} />);
    expect(await screen.findByRole("heading", { name: title })).toBeVisible();
    const main = screen.getByRole("main");
    expect(within(main).getAllByRole("heading", { level: 2 })).toHaveLength(sections);
    expect(main).toHaveTextContent(`Last updated: ${updated}`);
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
