import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { getCareerBySlug } from "../careers/careers.js";
import { SiteChrome } from "./SiteChrome.js";
import { parseRoute, type SitePath, type SiteRoute } from "./routes.js";
import { useRouteMeta } from "./seo.js";
import { LandingPage } from "./pages/LandingPage.js";
import "./site.css";
import "./v2.css";
import "./art-direction.css";

/** Start path owns the sim shell — keep it off the landing critical path. */
const StartPage = lazy(async () => {
  const mod = await import("./pages/StartPage.js");
  return { default: mod.StartPage };
});

const TrustPage = lazy(async () => {
  const mod = await import("./pages/TrustPage.js");
  return { default: mod.TrustPage };
});

const FaqPage = lazy(async () => {
  const mod = await import("./pages/FaqPage.js");
  return { default: mod.FaqPage };
});

const CareersPage = lazy(async () => {
  const mod = await import("./pages/CareersPage.js");
  return { default: mod.CareersPage };
});

const CareerDetailPage = lazy(async () => {
  const mod = await import("./pages/CareerDetailPage.js");
  return { default: mod.CareerDetailPage };
});

const NotFoundPage = lazy(async () => {
  const mod = await import("./pages/NotFoundPage.js");
  return { default: mod.NotFoundPage };
});

function scheduleIdle(run: () => void, timeout = 2000): () => void {
  const idle = window as Window & {
    requestIdleCallback?: (
      cb: () => void,
      opts?: { timeout: number },
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  if (typeof idle.requestIdleCallback === "function") {
    const handle = idle.requestIdleCallback(run, { timeout });
    return () => {
      idle.cancelIdleCallback(handle);
    };
  }
  const handle = window.setTimeout(run, 400);
  return () => {
    window.clearTimeout(handle);
  };
}

/** Warm the start/film route after landing paint without blocking first content. */
function usePrefetchStartChunk(route: SiteRoute): void {
  useEffect(() => {
    if (route.kind !== "home") return;
    return scheduleIdle(() => {
      void import("./pages/StartPage.js");
    }, 3000);
  }, [route.kind]);
}

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
      if (document.activeElement !== initialFocus && document.activeElement !== document.body) return true;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      return true;
    };
    if (focusHeading()) return;
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    observer.observe(main, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => { observer.disconnect(); }, 10000);
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [route, initialRoute]);

  useRouteMeta(route);
  usePrefetchStartChunk(route);

  const pageFallback = <p className="mode-note">Loading…</p>;
  const selectedCareer = route.kind === "career" ? getCareerBySlug(route.slug) : undefined;

  return (
    <SiteChrome route={route}>
      {route.kind === "home" ? <LandingPage /> : null}
      {route.kind === "careers" ? (
        <Suspense fallback={pageFallback}><CareersPage /></Suspense>
      ) : null}
      {selectedCareer ? (
        <Suspense fallback={pageFallback}>
          <CareerDetailPage career={selectedCareer} />
        </Suspense>
      ) : null}
      {route.kind === "not-found" || (route.kind === "career" && !selectedCareer) ? (
        <Suspense fallback={pageFallback}><NotFoundPage /></Suspense>
      ) : null}
      {route.kind === "trust" ? (
        <Suspense fallback={pageFallback}>
          <TrustPage />
        </Suspense>
      ) : null}
      {route.kind === "faq" ? (
        <Suspense fallback={pageFallback}>
          <FaqPage />
        </Suspense>
      ) : null}
      {route.kind === "start" ? (
        <Suspense fallback={<p className="mode-note">Loading start…</p>}>
          <StartPage />
        </Suspense>
      ) : null}
    </SiteChrome>
  );
}
