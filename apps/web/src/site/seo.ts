import { useEffect } from "react";
import type { SiteRoute } from "./routes.js";

const SITE_NAME = "First Shift";
const BASE_URL = "https://careerexpo.example.com";

type RouteMeta = {
  title: string;
  description: string;
  path: SiteRoute;
  index: boolean;
};

export const ROUTE_META: Record<SiteRoute, RouteMeta> = {
  "/": {
    title: "First Shift · Try day one as a cybersecurity analyst",
    description:
      "First Shift, the first playable workday from Career Expo: day one as a Junior Cybersecurity Analyst at Verdaly Technologies — a bounded 10–15 minute career simulation. Read evidence, decide, see consequences.",
    path: "/",
    index: true,
  },
  "/how-it-works": {
    title: "How the First Shift workday works · Career Expo",
    description:
      "Handoff, suspicious-login investigation, routine monitoring, phishing report and false-positive review across email, alerts, tickets, knowledge base and team chat.",
    path: "/how-it-works",
    index: true,
  },
  "/trust": {
    title: "Privacy and safety, honest beta summary · First Shift",
    description:
      "Owner-only reflections, explicit expiring sharing grants, bounded AI dialogue only, no fit scores or rankings. Beta summary, not legal advice.",
    path: "/trust",
    index: true,
  },
  "/faq": {
    title: "FAQ: scope, access, assessment limits · First Shift",
    description:
      "How long is the shift, do you need gaming skill, what does AI do, are reflections shared, is 3D required, is this a real job assessment?",
    path: "/faq",
    index: true,
  },
  "/start": {
    title: "Start your First Shift workday · Career Expo",
    description:
      "Watch the short preview film, then work the Verdaly SOC the way you prefer.",
    path: "/start",
    index: false,
  },
};

function upsertMeta(selector: string, create: () => HTMLElement): HTMLElement {
  const existing = document.querySelector(selector);
  if (existing instanceof HTMLElement) return existing;
  const element = create();
  document.head.appendChild(element);
  return element;
}

export function useRouteMeta(route: SiteRoute): void {
  useEffect(() => {
    const meta = ROUTE_META[route];
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
