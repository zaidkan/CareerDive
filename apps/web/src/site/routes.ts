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
  const path = pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
  if (path === "/") return { kind: "home" };
  if (path === "/careers") return { kind: "careers" };
  if (path === "/how-it-works") return { kind: "how-it-works" };
  if (path === "/trust") return { kind: "trust" };
  if (path === "/faq") return { kind: "faq" };
  if (path === "/start") return { kind: "start" };
  const match = /^\/careers\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
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
