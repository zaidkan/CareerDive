import { useOsSession } from "../osSession.js";

export type OsAppId = "desktop" | "browser" | "files" | "notes";

export type BrowserPageId = "ops" | "intranet";

/** Resolved history entry: either an allowlisted page or a blocked address. */
export type BrowserNav =
  | { kind: "page"; page: BrowserPageId }
  | { kind: "blocked"; url: string };

export const BROWSER_PAGES: ReadonlyArray<{
  id: BrowserPageId;
  title: string;
  url: string;
}> = [
  { id: "ops", title: "SOC Ops Console", url: "verdaly://ops" },
  { id: "intranet", title: "Company intranet", url: "verdaly://intranet" },
];

/**
 * Canonical allowlist. Exact normalized URLs only — no wildcards, no external
 * schemes, no iframe targets. Shift-required Verdaly resources resolve to the
 * page that hosts them (ops console shell or intranet).
 */
const ALLOWED_PAGE_BY_URL: Readonly<Record<string, BrowserPageId>> = {
  "verdaly://ops": "ops",
  "verdaly://ops/home": "ops",
  "verdaly://ops/alerts": "ops",
  "verdaly://mail/inbox": "ops",
  "verdaly://cases": "ops",
  "verdaly://kb": "ops",
  "verdaly://chat": "ops",
  "verdaly://calendar": "ops",
  "verdaly://intranet": "intranet",
};

export function pageUrl(page: BrowserPageId): string {
  return BROWSER_PAGES.find((entry) => entry.id === page)?.url ?? "verdaly://ops";
}

export function pageNav(page: BrowserPageId): BrowserNav {
  return { kind: "page", page };
}

export function navUrl(nav: BrowserNav): string {
  return nav.kind === "page" ? pageUrl(nav.page) : nav.url;
}

export function sameNav(a: BrowserNav, b: BrowserNav): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "page" && b.kind === "page") return a.page === b.page;
  if (a.kind === "blocked" && b.kind === "blocked") return a.url === b.url;
  return false;
}

/** Normalize for allowlist matching only (display keeps the typed form). */
function normalizeAddress(raw: string): string {
  return raw.trim().toLowerCase().replace(/\/+$/, "");
}

/**
 * Single router for every address-bar and bookmark navigation attempt.
 * Allowlisted URLs become pages; anything else becomes a blocked entry.
 * Never fetches, never opens an iframe, never returns a fake loaded page.
 */
export function resolveAddress(raw: string): BrowserNav {
  const trimmed = raw.trim();
  if (!trimmed) return pageNav("ops");
  const key = normalizeAddress(trimmed);
  const page = ALLOWED_PAGE_BY_URL[key];
  if (page) return pageNav(page);
  return { kind: "blocked", url: trimmed };
}

export function isAllowlisted(raw: string): boolean {
  const key = normalizeAddress(raw);
  return key in ALLOWED_PAGE_BY_URL;
}

export function useBrowserHistory(windowId = "window-1") {
  const { state, dispatch } = useOsSession();
  const history = state.browserHistories[windowId] ?? { entries: [pageNav("ops")], index: 0 };
  const nav = history.entries[history.index] ?? pageNav("ops");
  const page = nav.kind === "page" ? nav.page : null;
  const navigate = (next: BrowserNav) => {
    dispatch({ type: "browser_navigate", windowId, nav: next });
  };
  return {
    nav,
    page,
    canBack: history.index > 0,
    canForward: history.index < history.entries.length - 1,
    back: () => {
      dispatch({ type: "browser_back", windowId });
    },
    forward: () => {
      dispatch({ type: "browser_forward", windowId });
    },
    navigate,
    openPage: (pageId: BrowserPageId) => {
      navigate(pageNav(pageId));
    },
  };
}
