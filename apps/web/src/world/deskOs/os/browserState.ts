import { useOsSession } from "../osSession.js";

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

export function useBrowserHistory(initial: BrowserPageId = "ops") {
  const { state, dispatch } = useOsSession();
  const history = state.browserHistory;
  const page = history.entries[history.index] ?? initial;
  return {
    page,
    canBack: history.index > 0,
    canForward: history.index < history.entries.length - 1,
    back: () => {
      dispatch({ type: "browser_back" });
    },
    forward: () => {
      dispatch({ type: "browser_forward" });
    },
    navigate: (next: BrowserPageId) => {
      dispatch({ type: "browser_navigate", page: next });
    },
  };
}
