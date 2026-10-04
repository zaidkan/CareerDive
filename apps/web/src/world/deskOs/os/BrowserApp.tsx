import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  BROWSER_PAGES,
  navUrl,
  resolveAddress,
  useBrowserHistory,
} from "./browserState.js";
import { OsIcon } from "./Icons.js";
import { prefersReducedMotion } from "./reducedMotion.js";

export function BrowserApp({ opsConsole, windowId = "window-1" }: { opsConsole: ReactNode; windowId?: string }) {
  const { nav, page, draft, setDraft, canBack, canForward, back, forward, openPage, navigate } =
    useBrowserHistory(windowId);
  const currentUrl = navUrl(nav);
  const addressRef = useRef<HTMLInputElement | null>(null);
  const [reloading, setReloading] = useState(false);
  const timer = useRef<number | null>(null);
  const addressId = `${windowId}-os-address-bar`;
  const addressHintId = `${windowId}-os-address-bar-hint`;
  const bookmarkHintId = `${windowId}-os-ops-bookmark-hint`;

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

  const submitAddress = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(currentUrl);
      return;
    }
    const next = resolveAddress(trimmed);
    navigate(next);
  };

  const onAddressKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitAddress();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(currentUrl);
      addressRef.current?.select();
    }
  };

  const blocked = nav.kind === "blocked" ? nav : null;

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
            <OsIcon name="nav-back" size={16} />
          </button>
          <button
            aria-label="Go forward"
            className="os-nav-btn"
            disabled={!canForward}
            onClick={forward}
            type="button"
          >
            <OsIcon name="nav-forward" size={16} />
          </button>
          <button
            aria-label="Reload page"
            className="os-nav-btn"
            disabled={reloading}
            onClick={reload}
            type="button"
          >
            <OsIcon name="nav-reload" size={16} />
          </button>
        </div>
        <label className="visually-hidden" htmlFor={addressId}>
          Address bar
        </label>
        <div className="os-address-field">
          <OsIcon className="os-address-lock" name="lock" size={13} />
          <input
            aria-describedby={addressHintId}
            className="os-address-input"
            id={addressId}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            onKeyDown={onAddressKeyDown}
            ref={addressRef}
            spellCheck={false}
            type="text"
            value={draft}
          />
        </div>
        <span className="visually-hidden" id={addressHintId}>
          Approved workplace sites only.
        </span>
      </div>
      <nav aria-label="Bookmarks" className="os-bookmarks">
        {BROWSER_PAGES.map((entry) => (
          <button
            aria-current={entry.id === "ops" && page === entry.id ? "page" : undefined}
            aria-describedby={entry.id === "ops" ? bookmarkHintId : undefined}
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
        <span className="visually-hidden" id={bookmarkHintId}>
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
              This noticeboard is background context. Your open
              work is in the SOC Ops Console bookmark.
            </p>
          </article>
        ) : null}
        {blocked ? (
          <article aria-label="Address unavailable" className="os-blocked">
            <p className="eyebrow">Managed workstation</p>
            <h3>Address unavailable</h3>
            <p className="os-blocked-policy">
              This destination is blocked by organization policy. This workstation
              only opens approved Verdaly resources — Mail, Cases, Guides, Team,
              and Meetings stay available inside the SOC Ops Console.
            </p>
            <p className="os-blocked-url">{blocked.url}</p>
            <button
              className="os-blocked-return"
              onClick={() => {
                openPage("ops");
              }}
              type="button"
            >
              Return to SOC Ops Console
            </button>
          </article>
        ) : null}
      </div>
    </section>
  );
}
