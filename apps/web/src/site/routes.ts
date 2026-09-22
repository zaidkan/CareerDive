export type SiteRoute = "/" | "/how-it-works" | "/trust" | "/faq" | "/start";

export const SITE_ROUTES: SiteRoute[] = [
  "/",
  "/how-it-works",
  "/trust",
  "/faq",
  "/start",
];

export function parseRoute(pathname: string): SiteRoute {
  if (pathname === "/how-it-works") return "/how-it-works";
  if (pathname === "/trust") return "/trust";
  if (pathname === "/faq") return "/faq";
  if (pathname === "/start") return "/start";
  return "/";
}

export function navigate(route: SiteRoute): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== route) {
    window.history.pushState(null, "", route);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  window.scrollTo({ top: 0 });
}
