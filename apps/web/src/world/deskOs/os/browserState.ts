import { useState } from "react";

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

interface BrowserHistory {
  entries: BrowserPageId[];
  index: number;
}

export function useBrowserHistory(initial: BrowserPageId = "ops") {
  const [history, setHistory] = useState<BrowserHistory>({ entries: [initial], index: 0 });
  const page = history.entries[history.index] ?? initial;
  const navigate = (next: BrowserPageId) => {
    setHistory((current) => {
      const base = current.entries.slice(0, current.index + 1);
      if (base[base.length - 1] === next) return current;
      const entries = [...base, next];
      return { entries, index: entries.length - 1 };
    });
  };
  return {
    page,
    canBack: history.index > 0,
    canForward: history.index < history.entries.length - 1,
    back: () => {
      setHistory((current) => ({ ...current, index: Math.max(0, current.index - 1) }));
    },
    forward: () => {
      setHistory((current) => ({
        ...current,
        index: Math.min(current.entries.length - 1, current.index + 1),
      }));
    },
    navigate,
  };
}
