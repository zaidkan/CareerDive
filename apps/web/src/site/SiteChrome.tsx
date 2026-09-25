import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { navigate, type SitePath, type SiteRoute } from "./routes.js";
import { ThemeToggle } from "./ThemeToggle.js";

const GATE_KEY = "first-shift-start-gate";

function useGateSeen(): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    try {
      const v = window.sessionStorage.getItem(GATE_KEY);
      if (v === "briefing" || v === "sim") setSeen(true);
    } catch {
      // ignore
    }
    const onStorage = () => {
      try {
        const v = window.sessionStorage.getItem(GATE_KEY);
        if (v === "briefing" || v === "sim") setSeen(true);
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);
    // also listen to popstate/navigate changes - poll on route changes
    window.addEventListener("popstate", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("popstate", onStorage);
    };
  }, []);
  return seen;
}
const NAV: Array<{ route: SitePath; label: string }> = [
  { route: "/", label: "Home" },
  { route: "/careers", label: "Careers" },
  { route: "/how-it-works", label: "How it works" },
  { route: "/trust", label: "Privacy and safety" },
  { route: "/faq", label: "FAQ" },
];

function go(route: SitePath) {
  return (event: { preventDefault: () => void }) => {
    event.preventDefault();
    navigate(route);
  };
}

export function SiteChrome({
  route,
  children,
}: {
  route: SiteRoute;
  children: ReactNode;
}) {
  const hasSeenFilm = useGateSeen();
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-nav">
        <div className="site-nav-inner">
          <a
            className="site-nav-brand"
            href="/"
            onClick={go("/")}
            aria-label="Career Expo home"
          >
            Career Expo <span className="brand-beta">Beta</span>
          </a>
          <nav aria-label="Primary">
            <ul className="site-nav-links">
              {NAV.map(({ route: target, label }) => (
                <li key={target}>
                  <a
                    href={target}
                    aria-current={(route.kind === "career" && target === "/careers") ||
                      (route.kind === "home" && target === "/") ||
                      (route.kind === target.slice(1)) ? "page" : undefined}
                    onClick={go(target)}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <ThemeToggle />
          <a className="button-secondary" href="/start" onClick={go("/start")}>
            {hasSeenFilm ? "Continue" : "Start"}
          </a>
        </div>
      </header>
      <main id="main-content" className={route.kind === "start" ? undefined : "site-main-public"}>{children}</main>
      <footer className="site-footer">
        <nav aria-label="Footer">
          <ul>
            <li>
              <a href="/" onClick={go("/")}>
                Home
              </a>
            </li>
            <li>
              <a href="/careers" onClick={go("/careers")}>Careers</a>
            </li>
            <li>
              <a href="/how-it-works" onClick={go("/how-it-works")}>
                How the shift works
              </a>
            </li>
            <li>
              <a href="/trust" onClick={go("/trust")}>
                Privacy and safety, beta summary
              </a>
            </li>
            <li>
              <a href="/faq" onClick={go("/faq")}>
                FAQ
              </a>
            </li>
            <li>
              <a href="/start" onClick={go("/start")}>
                {hasSeenFilm ? "Continue to Verdaly" : "Start your first day"}
              </a>
            </li>
            <li>
              <a
                href="https://github.com/zaidkan/Career-Expo"
                target="_blank"
                rel="noreferrer"
              >
                Source on GitHub
              </a>
            </li>
          </ul>
        </nav>
        <p className="privacy-note">
          Beta. First Shift is the first playable workday from Career Expo.
          Trust page is an honest engineering summary and will change
          before public launch. Reflections stay private unless you explicitly
          share them.
        </p>
      </footer>
    </>
  );
}
