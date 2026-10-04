import { launchEvent } from "../analytics.js";
import { useEffect, useRef, useState } from "react";
import { getCareerBySlug } from "../careers/careers.js";
import { SiteChrome } from "./SiteChrome.js";
import { parseRoute, type SitePath, type SiteRoute } from "./routes.js";
import { useRouteMeta } from "./seo.js";
import { LandingPage } from "./pages/LandingPage.js";
import { CareersPage } from "./pages/CareersPage.js";
import { CareerDetailPage } from "./pages/CareerDetailPage.js";
import { FaqPage } from "./pages/FaqPage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";
import { StartPage } from "./pages/StartPage.js";
import { TrustPage } from "./pages/TrustPage.js";
import "./site.css";
import "./v2.css";
import "./art-direction.css";
import "./home.css";

/** Removed route: map to home first, then rewrite the history entry (no push, no popstate dispatch). */
function resolveInitialRoute(pathname: string): SiteRoute {
  const parsed = parseRoute(pathname);
  if (parsed.kind !== "how-it-works") return parsed;
  if (
    typeof window !== "undefined" &&
    parseRoute(window.location.pathname).kind === "how-it-works"
  ) {
    window.history.replaceState(null, "", "/");
  }
  return { kind: "home" };
}

export function SiteApp({ initialRoute }: { initialRoute?: SitePath }) {
  const previousPath = useRef<string | null>(null);
  const [route, setRoute] = useState<SiteRoute>(
    resolveInitialRoute(
      initialRoute
        ? initialRoute
        : typeof window === "undefined"
          ? "/"
          : window.location.pathname,
    ),
  );

  useEffect(() => {
    if (initialRoute) return;
    const onPop = () => {
      setRoute(parseRoute(window.location.pathname));
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, [initialRoute]);

  useEffect(() => {
    if (route.kind !== "how-it-works") return;
    window.history.replaceState(null, "", "/");
    setRoute({ kind: "home" });
  }, [route]);

  useEffect(() => {
    if (initialRoute) return;
    const path = window.location.pathname;
    if (previousPath.current === null) {
      previousPath.current = path;
      return;
    }
    if (previousPath.current === path) return;
    previousPath.current = path;
    const main = document.getElementById("main-content");
    if (!main) return;
    const initialFocus = document.activeElement;
    const focusHeading = () => {
      const heading = main.querySelector<HTMLElement>("h1");
      if (!heading) return false;
      if (
        document.activeElement !== initialFocus &&
        document.activeElement !== document.body
      )
        return true;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      return true;
    };
    if (focusHeading()) return;
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    observer.observe(main, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => {
      observer.disconnect();
    }, 10000);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [route, initialRoute]);

  useEffect(() => {
    if (route.kind === "home") launchEvent("landing");
    if (route.kind === "career")
      launchEvent("career_viewed", getCareerBySlug(route.slug)?.id);
  }, [route]);
  useRouteMeta(route);
  const selectedCareer =
    route.kind === "career" ? getCareerBySlug(route.slug) : undefined;

  return (
    <SiteChrome route={route}>
      {route.kind === "home" ? <LandingPage /> : null}
      {route.kind === "careers" ? <CareersPage /> : null}
      {selectedCareer ? <CareerDetailPage career={selectedCareer} /> : null}
      {route.kind === "not-found" ||
      (route.kind === "career" && !selectedCareer) ? (
        <NotFoundPage />
      ) : null}
      {route.kind === "trust" ? <TrustPage /> : null}
      {route.kind === "faq" ? <FaqPage /> : null}
      {route.kind === "start" ? <StartPage /> : null}
    </SiteChrome>
  );
}
