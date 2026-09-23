export type OsAppId = "desktop" | "browser" | "files" | "notes";

export type BrowserPageId = "ops" | "intranet";

export const BROWSER_PAGES: ReadonlyArray<{
  id: BrowserPageId;
  title: string;
  url: string;
}> = [
  { id: "ops", title: "SOC Ops Console", url: "verdaly://ops" },
  { id: "intranet", title: "Company intranet", url: "verdaly://intranet" },
];

export function pageUrl(page: BrowserPageId): string {
  return BROWSER_PAGES.find((entry) => entry.id === page)?.url ?? "verdaly://ops";
}

export interface BrowserHistory {
  entries: BrowserPageId[];
  index: number;
}

export type BrowserHistoryAction =
  | { type: "navigate"; page: BrowserPageId }
  | { type: "back" }
  | { type: "forward" };

export function initialBrowserHistory(
  initial: BrowserPageId = "ops",
): BrowserHistory {
  return { entries: [initial], index: 0 };
}

export function browserPage(
  history: BrowserHistory,
  fallback: BrowserPageId = "ops",
): BrowserPageId {
  return history.entries[history.index] ?? fallback;
}

export function canBrowserBack(history: BrowserHistory): boolean {
  return history.index > 0;
}

export function canBrowserForward(history: BrowserHistory): boolean {
  return history.index < history.entries.length - 1;
}

/** Pure browser history transitions (owned by the OS session in A1). */
export function reduceBrowserHistory(
  history: BrowserHistory,
  action: BrowserHistoryAction,
): BrowserHistory {
  switch (action.type) {
    case "navigate": {
      const base = history.entries.slice(0, history.index + 1);
      if (base[base.length - 1] === action.page) return history;
      const entries = [...base, action.page];
      return { entries, index: entries.length - 1 };
    }
    case "back":
      return history.index === 0
        ? history
        : { ...history, index: Math.max(0, history.index - 1) };
    case "forward":
      return history.index >= history.entries.length - 1
        ? history
        : {
            ...history,
            index: Math.min(history.entries.length - 1, history.index + 1),
          };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
