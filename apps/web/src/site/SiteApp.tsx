import { lazy, Suspense, useEffect, useState } from "react";
import { SiteChrome } from "./SiteChrome.js";
import { parseRoute, type SiteRoute } from "./routes.js";
import { useRouteMeta } from "./seo.js";
import { LandingPage } from "./pages/LandingPage.js";
import "./site.css";

/** Start path owns the sim shell — keep it off the landing critical path. */
const StartPage = lazy(async () => {
  const mod = await import("./pages/StartPage.js");
  return { default: mod.StartPage };
});

const HowItWorksPage = lazy(async () => {
  const mod = await import("./pages/HowItWorksPage.js");
  return { default: mod.HowItWorksPage };
});

const TrustPage = lazy(async () => {
  const mod = await import("./pages/TrustPage.js");
  return { default: mod.TrustPage };
});

const FaqPage = lazy(async () => {
  const mod = await import("./pages/FaqPage.js");
  return { default: mod.FaqPage };
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
    if (route !== "/") return;
    return scheduleIdle(() => {
      void import("./pages/StartPage.js");
    }, 3000);
  }, [route]);
}

export function SiteApp({ initialRoute }: { initialRoute?: SiteRoute }) {
  const [route, setRoute] = useState<SiteRoute>(
    initialRoute ??
      (typeof window === "undefined"
        ? "/"
        : parseRoute(window.location.pathname)),
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
    if (initialRoute) return;
    document
      .querySelector<HTMLElement>("#main-content h1, #main-content h2")
      ?.setAttribute("tabindex", "-1");
    document
      .querySelector<HTMLElement>("#main-content h1, #main-content h2")
      ?.focus({ preventScroll: true });
  }, [route, initialRoute]);

  useRouteMeta(route);
  usePrefetchStartChunk(route);

  const pageFallback = <p className="mode-note">Loading…</p>;

  return (
    <SiteChrome route={route}>
      {route === "/" ? <LandingPage /> : null}
      {route === "/how-it-works" ? (
        <Suspense fallback={pageFallback}>
          <HowItWorksPage />
        </Suspense>
      ) : null}
      {route === "/trust" ? (
        <Suspense fallback={pageFallback}>
          <TrustPage />
        </Suspense>
      ) : null}
      {route === "/faq" ? (
        <Suspense fallback={pageFallback}>
          <FaqPage />
        </Suspense>
      ) : null}
      {route === "/start" ? (
        <Suspense fallback={<p className="mode-note">Loading start…</p>}>
          <StartPage />
        </Suspense>
      ) : null}
    </SiteChrome>
  );
}
