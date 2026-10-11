import { useEffect } from "react";
import { getCareerBySlug } from "../careers/careers.js";
import type { SiteRoute } from "./routes.js";

const SITE_NAME = "CareerDive";
const BASE_URL =
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined) ??
  "https://careerdive.example.com";

type RouteMeta = {
  title: string;
  description: string;
  path: string;
  index: boolean;
};

export const ROUTE_META: Record<
  Exclude<SiteRoute["kind"], "career" | "not-found">,
  RouteMeta
> = {
  home: {
    title: "Explore Careers with a Career Simulation | CareerDive",
    description:
      "Unsure what career you want? Explore a junior cybersecurity analyst’s work in a 10–15-minute career simulation, then review your decisions. Four previews.",
    path: "/",
    index: true,
  },
  "how-it-works": {
    title: "How the short first-shift simulation works · CareerDive",
    description:
      "Try selected junior cybersecurity analyst tasks in a ~10–15-minute simulated first shift, then review an evidence-based debrief of your decisions and unknowns.",
    path: "/how-it-works",
    index: true,
  },
  trust: {
    title: "Privacy and safety · CareerDive",
    description:
      "What CareerDive stores during a first shift, how anonymous access checks work, authored dialogue, and why the debrief has no career-fit score.",
    path: "/trust",
    index: true,
  },
  faq: {
    title: "How Do I Know What Career I Want? Career FAQ | CareerDive",
    description:
      "Questions about exploring careers, trying a cybersecurity career simulation, privacy and the debrief. Understand what a short shift can and cannot tell you.",
    path: "/faq",
    index: true,
  },
  privacy: {
    title: "Privacy Policy | CareerDive",
    description: "CareerDive's privacy policy: anonymous sessions, saved simulation information, browser storage, service providers, and deletion requests.",
    path: "/privacy",
    index: true,
  },
  terms: {
    title: "Terms of Use | CareerDive",
    description: "Terms for CareerDive's educational career simulations, including age 13+ access, responsible use, availability, and contact information.",
    path: "/terms",
    index: true,
  },
  start: {
    title: "Start a Cybersecurity Career Simulation | CareerDive",
    description:
      "Watch the short arrival film, then try a ~10–15-minute cybersecurity first-shift simulation at fictional Verdaly and review your evidence-based debrief.",
    path: "/start",
    index: false,
  },
  careers: {
    title: "Explore Careers: Cybersecurity and Career Previews | CareerDive",
    description:
      "Explore careers through selected work tasks. Try a junior cybersecurity analyst simulation; preview nursing, mechanical engineering, electrical work and law.",
    path: "/careers",
    index: true,
  },
};

export function metaForRoute(route: SiteRoute): RouteMeta {
  if (route.kind === "how-it-works") return ROUTE_META.home;
  if (route.kind === "not-found") {
    return {
      title: "Page not found · CareerDive",
      description: "This CareerDive page could not be found.",
      path: route.pathname,
      index: false,
    };
  }
  if (route.kind === "career") {
    const career = getCareerBySlug(route.slug);
    if (!career?.detailPublished)
      return metaForRoute({
        kind: "not-found",
        pathname: `/careers/${route.slug}`,
      });
    return {
      title: `${career.title}: Day in the Life Simulation | CareerDive`,
      description:
        career.slug === "cybersecurity-analyst"
          ? "Curious about a cybersecurity analyst’s day? Try a 10–15-minute simulated first shift: review alerts, check evidence and leave a handoff. Not a full workday."
          : career.shortSummary,
      path: `/careers/${career.slug}`,
      index: true,
    };
  }
  return ROUTE_META[route.kind];
}

/** Origin is supplied by the existing Vite SITE_ORIGIN contract, like the sitemap. */
export function canonicalUrl(path: string): string {
  return new URL(path, `${BASE_URL}/`).href;
}

export function structuredDataForRoute(route: SiteRoute) {
  const meta = metaForRoute(route);
  if (!meta.index) return null;
  const url = canonicalUrl(meta.path);
  const website = {
    "@type": "WebSite",
    "@id": canonicalUrl("/#website"),
    name: SITE_NAME,
    url: canonicalUrl("/"),
    description: ROUTE_META.home.description,
    inLanguage: "en",
  };
  const page = {
    "@type": route.kind === "careers" ? "CollectionPage" : "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: meta.title,
    description: meta.description,
    inLanguage: "en",
    isPartOf: { "@id": website["@id"] },
    ...(route.kind === "career"
      ? { about: { "@id": `${url}#occupation` } }
      : {}),
  };
  const graph: Record<string, unknown>[] = [website, page];
  if (route.kind !== "home") {
    const crumbs = [{ name: SITE_NAME, item: canonicalUrl("/") }];
    if (route.kind === "career")
      crumbs.push({ name: "Explore careers", item: canonicalUrl("/careers") });
    crumbs.push({ name: meta.title.split(" | ")[0] ?? meta.title, item: url });
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumbs`,
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        ...crumb,
      })),
    });
  }
  if (route.kind === "career") {
    const career = getCareerBySlug(route.slug);
    if (career?.detailPublished) {
      // Describes the occupation discussed on the page, not a vacancy,
      // certification, assessment, salary promise, or complete working day.
      graph.push({
        "@type": "Occupation",
        "@id": `${url}#occupation`,
        name: career.title,
        description: career.workplaceSummary,
        skills: career.skills.join(", "),
        mainEntityOfPage: { "@id": page["@id"] },
      });
    }
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

function upsertMeta(selector: string, create: () => HTMLElement): HTMLElement {
  const existing = document.head.querySelector(selector);
  if (existing instanceof HTMLElement) return existing;
  const element = create();
  document.head.appendChild(element);
  return element;
}

export function useRouteMeta(route: SiteRoute): void {
  useEffect(() => {
    const meta = metaForRoute(route);
    const url = canonicalUrl(meta.path);
    const image = canonicalUrl("/og.png");
    const imageAlt =
      "Verdaly tower entrance with glowing doors beneath the VERDALY sign";
    document.title = meta.title;

    const tags = {
      description: meta.description,
      robots: meta.index ? "index,follow" : "noindex,follow",
      "twitter:card": "summary_large_image",
      "twitter:title": meta.title,
      "twitter:description": meta.description,
      "twitter:image": image,
      "twitter:image:alt": imageAlt,
    };
    const properties = {
      "og:type": "website",
      "og:site_name": SITE_NAME,
      "og:locale": "en_US",
      "og:title": meta.title,
      "og:description": meta.description,
      "og:url": url,
      "og:image": image,
      "og:image:width": "1200",
      "og:image:height": "630",
      "og:image:alt": imageAlt,
    };
    for (const [attribute, values] of [
      ["name", tags],
      ["property", properties],
    ] as const) {
      for (const [key, content] of Object.entries(values)) {
        const element = upsertMeta(`meta[${attribute}="${key}"]`, () => {
          const el = document.createElement("meta");
          el.setAttribute(attribute, key);
          return el;
        });
        element.setAttribute("content", content);
      }
    }
    const canonical = upsertMeta('link[rel="canonical"]', () => {
      const el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      return el;
    });
    canonical.setAttribute("href", url);

    const data = structuredDataForRoute(route);
    const existing = document.head.querySelector("#site-structured-data");
    if (!data) {
      existing?.remove();
      return;
    }
    const script = upsertMeta("#site-structured-data", () => {
      const el = document.createElement("script");
      el.id = "site-structured-data";
      el.setAttribute("type", "application/ld+json");
      return el;
    });
    script.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
  }, [route]);
}

export { SITE_NAME };
