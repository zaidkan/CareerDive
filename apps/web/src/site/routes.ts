import { getCareerBySlug } from "../careers/careers.js";

export type SitePath =
  | "/"
  | "/careers"
  | `/careers/${string}`
  | "/how-it-works"
  | "/trust"
  | "/faq"
  | "/start";

export type SiteRoute =
  | { kind: "home" }
  | { kind: "careers" }
  | { kind: "career"; slug: string }
  | { kind: "how-it-works" }
  | { kind: "trust" }
  | { kind: "faq" }
  | { kind: "start" }
  | { kind: "not-found"; pathname: string };

export function parseRoute(pathname: string): SiteRoute {
  if (pathname === "/") return { kind: "home" };
  if (pathname === "/careers") return { kind: "careers" };
  if (pathname === "/how-it-works") return { kind: "how-it-works" };
  if (pathname === "/trust") return { kind: "trust" };
  if (pathname === "/faq") return { kind: "faq" };
  if (pathname === "/start") return { kind: "start" };
  const match = /^\/careers\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(pathname);
  if (match?.[1] && getCareerBySlug(match[1])?.detailPublished) {
    return { kind: "career", slug: match[1] };
  }
  return { kind: "not-found", pathname };
}

export function navigate(route: SitePath): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== route) {
    window.history.pushState(null, "", route);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  window.scrollTo({ top: 0 });
}
