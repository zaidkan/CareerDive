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
    title: "Try a short cybersecurity shift and debrief · CareerDive",
    description:
      "Try a ~10–15-minute Junior Cybersecurity Analyst first-shift simulation. Review recorded decisions, evidence and unknowns. One playable career; four previews.",
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
      "What CareerDive stores during a first shift, how access checks work, current AI limits, and why the debrief has no career-fit score.",
    path: "/trust",
    index: true,
  },
  faq: {
    title: "FAQ: scope, access, assessment limits · CareerDive",
    description:
      "How long is the shift, do you need gaming skill, what does AI do, are reflections shared, is 3D required, is this a real job assessment?",
    path: "/faq",
    index: true,
  },
  start: {
    title: "Start your short first-shift simulation · CareerDive",
    description:
      "Watch the short arrival film, then try a ~10–15-minute cybersecurity first-shift simulation at fictional Verdaly and review your evidence-based debrief.",
    path: "/start",
    index: false,
  },
  careers: {
    title: "One playable career and four previews · CareerDive",
    description:
      "Start with one playable career, Junior Cybersecurity Analyst: a ~10–15-minute simulated slice and evidence-based debrief. Four other careers are previews only.",
    path: "/careers",
    index: true,
  },
};

function metaForRoute(route: SiteRoute): RouteMeta {
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
      title: `${career.title} · CareerDive`,
      description: career.shortSummary,
      path: `/careers/${career.slug}`,
      index: true,
    };
  }
  return ROUTE_META[route.kind];
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
    canonical.setAttribute("href", `${BASE_URL}${meta.path}`);

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
    ogUrl.setAttribute("content", `${BASE_URL}${meta.path}`);
  }, [route]);
}

export { SITE_NAME };
