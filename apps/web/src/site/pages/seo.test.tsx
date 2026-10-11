// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import { cleanup, renderHook, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { careers } from "../../careers/careers.js";
import {
  canonicalUrl,
  metaForRoute,
  structuredDataForRoute,
  useRouteMeta,
} from "../seo.js";
import { parseRoute, type SiteRoute } from "../routes.js";
import { FaqPage } from "./FaqPage.js";

afterEach(() => {
  cleanup();
  document.head
    .querySelectorAll("meta, link[rel=canonical], #site-structured-data")
    .forEach((el) => {
      el.remove();
    });
});

describe("public SEO", () => {
  it("keeps sitemap URLs aligned with indexable published routes", () => {
    const sitemap = readFileSync(
      new NodeURL("../../../public/sitemap.xml", import.meta.url),
      "utf8",
    );
    const paths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => {
      if (!match[1]) throw new Error("Sitemap location is empty");
      return new URL(match[1]).pathname;
    });
    expect(paths.sort()).toEqual(
      [
        "/",
        "/careers",
        "/faq",
        "/trust",
        "/privacy",
        "/terms",
        ...careers
          .filter((c) => c.detailPublished)
          .map((c) => `/careers/${c.slug}`),
      ].sort(),
    );
    for (const path of paths) {
      const meta = metaForRoute(parseRoute(path));
      expect(meta.index).toBe(true);
      expect(meta.path).toBe(path);
    }
    for (const career of careers.filter((c) => !c.detailPublished)) {
      const route = parseRoute(`/careers/${career.slug}`);
      expect(metaForRoute(route).index).toBe(false);
      expect(structuredDataForRoute(route)).toBeNull();
    }
  });

  it("updates all social tags and removes stale occupation markup when navigating", () => {
    const { rerender } = renderHook(
      ({ route }: { route: SiteRoute }) => {
        useRouteMeta(route);
      },
      { initialProps: { route: parseRoute("/") } },
    );
    for (const path of [
      "/careers/cybersecurity-analyst",
      "/faq",
      "/privacy",
      "/terms",
      "/start",
      "/missing",
      "/",
    ]) {
      const route = parseRoute(path);
      rerender({ route });
      const meta = metaForRoute(route);
      expect(document.title).toBe(meta.title);
      expect(
        document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      ).toBe(canonicalUrl(meta.path));
      for (const selector of [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
      ])
        expect(document.querySelector(selector)?.getAttribute("content")).toBe(
          meta.description,
        );
      expect(
        document
          .querySelector('meta[name="twitter:title"]')
          ?.getAttribute("content"),
      ).toBe(meta.title);
      expect(
        document
          .querySelector('meta[property="og:url"]')
          ?.getAttribute("content"),
      ).toBe(canonicalUrl(meta.path));
      expect(
        document
          .querySelector('meta[name="twitter:image"]')
          ?.getAttribute("content"),
      ).toBe(canonicalUrl("/og.png"));
      expect(
        document.querySelector('meta[name="robots"]')?.getAttribute("content"),
      ).toBe(meta.index ? "index,follow" : "noindex,follow");
      const data = document.querySelector("#site-structured-data");
      if (!meta.index) expect(data).toBeNull();
      else
        expect(data?.textContent.includes('"@type":"Occupation"')).toBe(
          route.kind === "career",
        );
    }
    expect(
      document.querySelectorAll('meta[name="twitter:title"]'),
    ).toHaveLength(1);
  });

  it("describes published career content without ratings or job offers", () => {
    const data = structuredDataForRoute(
      parseRoute("/careers/cybersecurity-analyst"),
    );
    expect(
      data?.["@graph"].find((node) => node["@type"] === "Occupation"),
    ).toMatchObject({ name: "Cybersecurity Analyst" });
    const text = JSON.stringify(data);
    expect(text).not.toMatch(
      /aggregateRating|reviewCount|JobPosting|estimatedSalary/,
    );
    expect(
      data?.["@graph"].find((node) => node["@type"] === "BreadcrumbList"),
    ).toHaveProperty(
      "itemListElement.2.item",
      canonicalUrl("/careers/cybersecurity-analyst"),
    );
  });

  it("marks up exactly the visible FAQ questions and answers", () => {
    const { container } = render(<FaqPage />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    if (!script) throw new Error("FAQ schema is missing");
    const schema = JSON.parse(script.textContent) as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    const details = [...container.querySelectorAll("details")];
    expect(schema.mainEntity).toHaveLength(details.length);
    schema.mainEntity.forEach(
      (
        question: { name: string; acceptedAnswer: { text: string } },
        index: number,
      ) => {
        expect(details[index]?.querySelector("summary")?.textContent).toBe(
          question.name,
        );
        expect(details[index]?.querySelector("p")?.textContent.trim()).toBe(
          question.acceptedAnswer.text,
        );
      },
    );
  });
});
