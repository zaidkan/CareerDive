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

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="3.8" fill="#F59E0B" opacity={0.14} />
      <circle
        cx="12"
        cy="12"
        r="5"
        fill="#FACC15"
        stroke="#EAB308"
        strokeWidth={0.9}
      />
      <g
        stroke="#FBBF24"
        strokeWidth={1.25}
        strokeLinecap="round"
        opacity={0.95}
      >
        <line x1="12" y1="2.4" x2="12" y2="4.8" />
        <line x1="12" y1="19.2" x2="12" y2="21.6" />
        <line x1="2.4" y1="12" x2="4.8" y2="12" />
        <line x1="19.2" y1="12" x2="21.6" y2="12" />
        <line x1="4.95" y1="4.95" x2="6.65" y2="6.65" />
        <line x1="17.35" y1="17.35" x2="19.05" y2="19.05" />
        <line x1="4.95" y1="19.05" x2="6.65" y2="17.35" />
        <line x1="17.35" y1="6.65" x2="19.05" y2="4.95" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9.2" fill="#EDE9FE" opacity={0.0} />
      <circle cx="12" cy="12" r="9" fill="#DDD6FE" opacity={0.12} />
      <path
        d="M15.25 4.35 A7.85 7.85 0 1 0 18.85 15.9 A5.55 5.55 0 0 1 15.25 4.35 Z"
        fill="#8B7CF8"
        stroke="#7C6EF0"
        strokeWidth={0.75}
      />
      <circle cx="7.15" cy="7.6" r={0.9} fill="#E0E7FF" />
      <circle cx="5.75" cy="12.9" r={0.55} fill="#C7D2FE" />
      <circle cx="16.6" cy="6.8" r={0.65} fill="#DDD6FE" />
      <circle cx="14.9" cy="18.15" r={0.45} fill="#E9E3FF" opacity={0.95} />
    </svg>
  );
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

  const isLight = theme === "light";
  const label = isLight ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      className={`theme-toggle theme-toggle--${theme}`}
      aria-label={label}
      title={label}
      onClick={() => {
        setTheme((current) => (current === "light" ? "dark" : "light"));
      }}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        <span className="theme-toggle-sun">
          <SunIcon />
        </span>
        <span className="theme-toggle-moon">
          <MoonIcon />
        </span>
      </span>
    </button>
  );
}
