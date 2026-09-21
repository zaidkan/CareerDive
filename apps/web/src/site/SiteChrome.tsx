import type { ReactNode } from "react";
import { navigate, type SiteRoute } from "./routes.js";
import { ThemeToggle } from "./ThemeToggle.js";

const NAV: Array<{ route: SiteRoute; label: string }> = [
  { route: "/", label: "Home" },
  { route: "/how-it-works", label: "How it works" },
  { route: "/trust", label: "Privacy and safety" },
  { route: "/faq", label: "FAQ" },
];

function go(route: SiteRoute) {
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
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="site-nav">
        <div className="site-nav-inner">
          <a
            className="site-nav-brand"
            href="/"
            onClick={go("/")}
            aria-label="First Shift home — Career Expo"
          >
            First Shift <span className="brand-beta">Beta</span>
          </a>
          <ul className="site-nav-links">
            {NAV.map(({ route: target, label }) => (
              <li key={target}>
                <a
                  href={target}
                  aria-current={route === target ? "page" : undefined}
                  onClick={go(target)}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <ThemeToggle />
          <a
            className="button-secondary"
            href="/start"
            onClick={go("/start")}
            style={{ minHeight: 44 }}
          >
            Start
          </a>
        </div>
      </div>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <nav aria-label="Footer">
          <ul>
            <li>
              <a href="/" onClick={go("/")}>
                Home
              </a>
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
                Start your first day
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
