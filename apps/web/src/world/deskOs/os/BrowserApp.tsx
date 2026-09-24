import { useEffect, useRef, useState, type ReactNode } from "react";
import { BROWSER_PAGES, pageUrl, useBrowserHistory, type BrowserPageId } from "./browserState.js";
import { prefersReducedMotion } from "./reducedMotion.js";

export function BrowserApp({ opsConsole }: { opsConsole: ReactNode }) {
  const { page, canBack, canForward, back, forward, navigate } = useBrowserHistory("ops");
  const [reloading, setReloading] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    },
    [],
  );
  const reload = () => {
    if (reloading) return;
    // Cosmetic only: never touches canonical state. Under reduced-motion the
    // feedback resolves synchronously so nothing depends on a timer.
    if (prefersReducedMotion()) return;
    setReloading(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setReloading(false);
    }, 400);
  };
  const openPage = (next: BrowserPageId) => {
    navigate(next);
  };
  return (
    <section aria-label="Browser" className="os-window os-browser">
      <div className="os-browser-bar">
        <div className="os-browser-nav" role="group" aria-label="Browser navigation">
          <button
            aria-label="Go back"
            className="os-nav-btn"
            disabled={!canBack}
            onClick={back}
            type="button"
          >
            ←
          </button>
          <button
            aria-label="Go forward"
            className="os-nav-btn"
            disabled={!canForward}
            onClick={forward}
            type="button"
          >
            →
          </button>
          <button
            aria-label="Reload page"
            className="os-nav-btn"
            disabled={reloading}
            onClick={reload}
            type="button"
          >
            ⟳
          </button>
        </div>
        <label className="visually-hidden" htmlFor="os-address-bar">
          Address bar
        </label>
        <input
          className="os-address-input"
          id="os-address-bar"
          readOnly
          type="text"
          value={pageUrl(page)}
        />
      </div>
      <nav aria-label="Bookmarks" className="os-bookmarks">
        {BROWSER_PAGES.map((entry) => (
          <button
            aria-current={entry.id === "ops" && page === entry.id ? "page" : undefined}
            aria-describedby={entry.id === "ops" ? "os-ops-bookmark-hint" : undefined}
            aria-pressed={page === entry.id}
            className={`os-bookmark${page === entry.id ? " os-bookmark-active" : ""}`}
            key={entry.id}
            onClick={() => {
              openPage(entry.id);
            }}
            type="button"
          >
            {entry.title}
          </button>
        ))}
        <span className="visually-hidden" id="os-ops-bookmark-hint">
          Start your shift here — opens the SOC work console.
        </span>
      </nav>
      <div className="os-page">
        <span aria-live="polite" className="visually-hidden">
          {reloading ? "Reloading page." : ""}
        </span>
        <div hidden={page !== "ops"}>{opsConsole}</div>
        {page === "intranet" ? (
          <article aria-label="Company intranet" className="os-intranet">
            <p className="eyebrow">Intranet</p>
            <h3>Company intranet</h3>
            <p>
              Office news, lunch menus, and the IT helpdesk live here. Your open
              work is in the SOC Ops Console bookmark.
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
