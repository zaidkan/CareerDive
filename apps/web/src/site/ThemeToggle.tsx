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
  const [theme, setTheme] = useState<SiteTheme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable; theme still applies for this session.
    }
  }, [theme]);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={theme === "light"}
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      onClick={() => {
        setTheme((current) => (current === "light" ? "dark" : "light"));
      }}
    >
      {theme === "light" ? "Dark mode" : "Light mode"}
    </button>
  );
}
