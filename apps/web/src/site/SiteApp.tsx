import { lazy, Suspense, useEffect, useState } from "react";
import { SiteChrome } from "./SiteChrome.js";
import { parseRoute, type SiteRoute } from "./routes.js";
import { useRouteMeta } from "./seo.js";
import { LandingPage } from "./pages/LandingPage.js";
import { HowItWorksPage } from "./pages/HowItWorksPage.js";
import { TrustPage } from "./pages/TrustPage.js";
import { FaqPage } from "./pages/FaqPage.js";
import "./site.css";

/** Start path owns the sim shell — keep it off the landing critical path. */
const StartPage = lazy(async () => {
  const mod = await import("./pages/StartPage.js");
  return { default: mod.StartPage };
});

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

  return (
    <SiteChrome route={route}>
      {route === "/" ? <LandingPage /> : null}
      {route === "/how-it-works" ? <HowItWorksPage /> : null}
      {route === "/trust" ? <TrustPage /> : null}
      {route === "/faq" ? <FaqPage /> : null}
      {route === "/start" ? (
        <Suspense fallback={<p className="mode-note">Loading start…</p>}>
          <StartPage />
        </Suspense>
      ) : null}
    </SiteChrome>
  );
}
