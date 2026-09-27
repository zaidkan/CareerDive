import { useEffect, useState } from "react";

export type SiteTheme = "dark" | "light";

const STORAGE_KEY = "career-expo-theme";

function initialTheme(): SiteTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Private mode or blocked storage: fall through to OS preference.
  }
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }
  return "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<SiteTheme>("dark");

  useEffect(() => {
    setTheme(initialTheme());
  }, []);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={theme === "light"}
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      onClick={() => {
        const next = theme === "light" ? "dark" : "light";
        setTheme(next);
        document.documentElement.dataset.theme = next;
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Storage unavailable; theme still works in this tab.
        }
      }}
    >
      {theme === "light" ? "Dark mode" : "Light mode"}
    </button>
  );
}
