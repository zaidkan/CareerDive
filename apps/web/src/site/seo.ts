import { useEffect } from "react";
import { careers, getCareerBySlug } from "../careers/careers.js";
import type { SiteRoute } from "./routes.js";

const SITE_NAME = "First Shift";

type RouteMeta = {
  title: string;
  description: string;
  path: string;
  index: boolean;
};

export const ROUTE_META: Record<Exclude<SiteRoute["kind"], "career" | "not-found">, RouteMeta> = {
  home: {
    title: "Experience the work before choosing a career · Career Expo",
    description:
      "Explore careers through realistic first-day work. Try a playable simulation, inspect work previews, and reflect on how the job feels.",
    path: "/",
    index: true,
  },
  "how-it-works": {
    title: "How the First Shift workday works · Career Expo",
    description:
      "Handoff, suspicious-login investigation, routine monitoring, phishing report and false-positive review across email, alerts, tickets, knowledge base and team chat.",
    path: "/how-it-works",
    index: true,
  },
  trust: {
    title: "Privacy and safety, honest beta summary · First Shift",
    description:
      "Owner-only reflections, explicit expiring sharing grants, bounded AI dialogue only, no fit scores or rankings. Beta summary, not legal advice.",
    path: "/trust",
    index: true,
  },
  faq: {
    title: "FAQ: scope, access, assessment limits · First Shift",
    description:
      "How long is the shift, do you need gaming skill, what does AI do, are reflections shared, is 3D required, is this a real job assessment?",
    path: "/faq",
    index: true,
  },
  start: {
    title: "Start your First Shift workday · Career Expo",
    description:
      "Watch the short preview film, then work the Verdaly SOC the way you prefer.",
    path: "/start",
    index: false,
  },
  careers: {
    title: "Explore careers · Career Expo",
    description: "Explore playable career simulations and previews of careers in the workshop.",
    path: "/careers",
    index: true,
  },
};

export function metaForRoute(route: SiteRoute): RouteMeta {
  if (route.kind === "not-found") {
    return {
      title: "Page not found · Career Expo",
      description: "This Career Expo page could not be found.",
      path: route.pathname,
      index: false,
    };
  }
  if (route.kind === "career") {
    const career = getCareerBySlug(route.slug);
    if (!career?.detailPublished) return metaForRoute({ kind: "not-found", pathname: `/careers/${route.slug}` });
    return {
      title: `${career.title} · Career Expo`,
      description: career.shortSummary,
      path: `/careers/${career.slug}`,
      index: true,
    };
  }
  return ROUTE_META[route.kind];
}

export const INDEXABLE_PATHS = [
  ...Object.values(ROUTE_META).filter((meta) => meta.index).map((meta) => meta.path),
  ...careers.filter((career) => career.detailPublished).map((career) => `/careers/${career.slug}`),
];

export function structuredDataForRoute(route: SiteRoute, origin: string): object[] {
  if (route.kind === "home") {
    return [{ "@context": "https://schema.org", "@type": "WebSite", name: "Career Expo", url: `${origin}/` }];
  }
  if (route.kind === "career") {
    const career = getCareerBySlug(route.slug);
    if (!career?.detailPublished) return [];
    const url = `${origin}/careers/${career.slug}`;
    return [{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: "Careers", item: `${origin}/careers` },
        { "@type": "ListItem", position: 3, name: career.title, item: url },
      ],
    }, {
      "@context": "https://schema.org",
      "@type": "Occupation",
      name: career.title,
      description: career.shortSummary,
      url,
    }];
  }
  return [];
}

function upsertMeta(selector: string, create: () => HTMLElement): HTMLElement {
  const existing = document.querySelector(selector);
  if (existing instanceof HTMLElement) return existing;
  const element = create();
  document.head.appendChild(element);
  return element;
}

export function useRouteMeta(route: SiteRoute): void {
  useEffect(() => {
    const meta = metaForRoute(route);
    const origin = document.querySelector('meta[name="site-origin"]')?.getAttribute("content") || window.location.origin;
    document.title = meta.title;

    const description = upsertMeta('meta[name="description"]', () => {
      const el = document.createElement("meta");
      el.setAttribute("name", "description");
      return el;
    });
    description.setAttribute("content", meta.description);

    const canonical = upsertMeta('link[rel="canonical"]', () => {
      const el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      return el;
    });
    if (meta.index) canonical.setAttribute("href", `${origin}${meta.path}`);
    else canonical.remove();

    const robots = upsertMeta('meta[name="robots"]', () => {
      const el = document.createElement("meta");
      el.setAttribute("name", "robots");
      return el;
    });
    robots.setAttribute(
      "content",
      meta.index ? "index,follow" : "noindex,follow",
    );

    const ogTitle = upsertMeta('meta[property="og:title"]', () => {
      const el = document.createElement("meta");
      el.setAttribute("property", "og:title");
      return el;
    });
    ogTitle.setAttribute("content", meta.title);

    const ogDescription = upsertMeta('meta[property="og:description"]', () => {
      const el = document.createElement("meta");
      el.setAttribute("property", "og:description");
      return el;
    });
    ogDescription.setAttribute("content", meta.description);

    const ogUrl = upsertMeta('meta[property="og:url"]', () => {
      const el = document.createElement("meta");
      el.setAttribute("property", "og:url");
      return el;
    });
    ogUrl.setAttribute("content", `${origin}${meta.path}`);

    const twitterTitle = upsertMeta('meta[name="twitter:title"]', () => {
      const el = document.createElement("meta");
      el.setAttribute("name", "twitter:title");
      return el;
    });
    twitterTitle.setAttribute("content", meta.title);

    const twitterDescription = upsertMeta('meta[name="twitter:description"]', () => {
      const el = document.createElement("meta");
      el.setAttribute("name", "twitter:description");
      return el;
    });
    twitterDescription.setAttribute("content", meta.description);

    for (const script of document.querySelectorAll('script[data-site-json-ld]')) script.remove();
    for (const data of structuredDataForRoute(route, origin)) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.siteJsonLd = "";
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    }
  }, [route]);
}

export { SITE_NAME };
