import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { getCareerBySlug } from "../careers/careers.js";
import { SiteChrome } from "./SiteChrome.js";
import { parseRoute, type SitePath, type SiteRoute } from "./routes.js";
import { useRouteMeta } from "./seo.js";
import { LandingPage } from "./pages/LandingPage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";
import "./site.css";
import "./v2.css";
import "./art-direction.css";
import "./home.css";

// Keep the landing heading on the initial path; other pages and their assets
// load only when selected, without pulling the career workshop into every visit.
const CareersPage = lazy(() =>
  import("./pages/CareersPage.js").then((mod) => ({
    default: mod.CareersPage,
  })),
);
const CareerDetailPage = lazy(() =>
  import("./pages/CareerDetailPage.js").then((mod) => ({
    default: mod.CareerDetailPage,
  })),
);
const FaqPage = lazy(() =>
  import("./pages/FaqPage.js").then((mod) => ({ default: mod.FaqPage })),
);
const StartPage = lazy(() =>
  import("./pages/StartPage.js").then((mod) => ({ default: mod.StartPage })),
);
const TrustPage = lazy(() =>
  import("./pages/TrustPage.js").then((mod) => ({ default: mod.TrustPage })),
);
const LegalPage = lazy(() =>
  import("./pages/LegalPage.js").then((mod) => ({ default: mod.LegalPage })),
);

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
    // Optional analytics must not put simulation schemas on the public site's
    // critical path, especially when event collection is disabled entirely.
    if (import.meta.env.VITE_LAUNCH_ANALYTICS_ENABLED !== "true") return;
    if (route.kind !== "home" && route.kind !== "career") return;
    void import("../analytics.js")
      .then(({ launchEvent }) => {
        if (route.kind === "home") launchEvent("landing");
        if (route.kind === "career")
          launchEvent("career_viewed", getCareerBySlug(route.slug)?.id);
      })
      .catch(() => {
        // Best effort: an analytics chunk failure must not block navigation.
      });
  }, [route]);
  useRouteMeta(route);
  const selectedCareer =
    route.kind === "career" ? getCareerBySlug(route.slug) : undefined;

  return (
    <SiteChrome route={route}>
      <Suspense
        key={route.kind === "career" ? route.slug : route.kind}
        fallback={
          <p className="page-section" role="status">
            Loading…
          </p>
        }
      >
        {route.kind === "home" ? <LandingPage /> : null}
        {route.kind === "careers" ? <CareersPage /> : null}
        {selectedCareer ? <CareerDetailPage career={selectedCareer} /> : null}
        {route.kind === "not-found" ||
        (route.kind === "career" && !selectedCareer) ? (
          <NotFoundPage />
        ) : null}
        {route.kind === "trust" ? <TrustPage /> : null}
        {route.kind === "faq" ? <FaqPage /> : null}
        {route.kind === "privacy" || route.kind === "terms" ? (
          <LegalPage document={route.kind} />
        ) : null}
        {route.kind === "start" ? <StartPage /> : null}
      </Suspense>
    </SiteChrome>
  );
}
