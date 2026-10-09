import type { ReactNode, SVGProps } from "react";

/**
 * One authored icon language for the whole workstation: 24×24 grid, single
 * 2px stroke, round caps and joins, currentColor. Icons are geometry, never
 * Unicode glyphs, so every surface shares the same weight and rhythm.
 */
export type OsIconName =
  | "alert"
  | "mail"
  | "ticket"
  | "book"
  | "chat"
  | "app-browser"
  | "app-files"
  | "app-notes"
  | "app-desktop"
  | "win-minimize"
  | "win-maximize"
  | "win-restore"
  | "win-close"
  | "nav-back"
  | "nav-forward"
  | "nav-reload"
  | "lock"
  | "folder"
  | "file"
  | "up"
  | "exit"
  | "expand"
  | "info";

function geometry(name: OsIconName): ReactNode {
  switch (name) {
    case "alert":
      return (
        <>
          <path d="M12 3L2.5 20h19L12 3z" />
          <path d="M12 9v5M12 17v.1" />
        </>
      );
    case "mail":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 6l9 7 9-7" />
        </>
      );
    case "ticket":
      return (
        <>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 3h6v4H9zM9 12h6M9 16h4" />
        </>
      );
    case "book":
      return (
        <>
          <path d="M12 6c-3-2-6-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1zM12 6v14" />
        </>
      );
    case "chat":
      return (
        <>
          <path d="M21 11a8 8 0 0 1-8 8H8l-5 3 1.5-6A8 8 0 1 1 21 11z" />
          <path d="M8 9h8M8 13h5" />
        </>
      );

    case "app-browser":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17" />
          <ellipse cx="12" cy="12" rx="4" ry="8.5" />
        </>
      );
    case "app-files":
    case "folder":
      return (
        <path d="M3 7a2 2 0 0 1 2-2h4l2.2 2.8H19a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      );
    case "app-notes":
      return (
        <>
          <path d="M4 20l1-4L16.5 4.5a2.12 2.12 0 0 1 3 3L8 19z" />
          <path d="M14.2 6.8l3 3" />
        </>
      );
    case "app-desktop":
      return (
        <>
          <rect x="3" y="4.5" width="18" height="12" rx="2" />
          <path d="M9 20h6" />
          <path d="M12 16.5V20" />
        </>
      );
    case "win-minimize":
      return <path d="M6 12h12" />;
    case "win-maximize":
      return <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />;
    case "win-restore":
      return (
        <>
          <rect x="8" y="8" width="11" height="11" rx="1.5" />
          <path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-8A1.5 1.5 0 0 0 5 6.5v8A1.5 1.5 0 0 0 6.5 16H8" />
        </>
      );
    case "win-close":
      return (
        <>
          <path d="M6.5 6.5l11 11" />
          <path d="M17.5 6.5l-11 11" />
        </>
      );
    case "nav-back":
      return (
        <>
          <path d="M19 12H5" />
          <path d="M11 6l-6 6 6 6" />
        </>
      );
    case "nav-forward":
      return (
        <>
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </>
      );
    case "nav-reload":
      return (
        <>
          <polyline points="22 4 22 10 16 10" />
          <polyline points="2 20 2 14 8 14" />
          <path d="M4.5 9a9 9 0 0 1 14.9-3.4L22 8" />
          <path d="M2 16l2.6 2.4A9 9 0 0 0 19.5 15" />
        </>
      );
    case "lock":
      return (
        <>
          <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
          <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
        </>
      );
    case "file":
      return (
        <>
          <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
          <path d="M13.5 3v3.5a2 2 0 0 0 2 2H20" />
        </>
      );
    case "up":
      return (
        <>
          <path d="M12 19V5" />
          <path d="M5.5 11.5L12 5l6.5 6.5" />
        </>
      );
    case "exit":
      return (
        <>
          <path d="M9.5 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.5" />
          <path d="M15.5 16.5L20 12l-4.5-4.5" />
          <path d="M20 12H9" />
        </>
      );
    case "expand":
      return (
        <>
          <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5V9" />
          <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9" />
          <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
          <path d="M15 20h3.5a1.5 1.5 0 0 0 1.5-1.5V15" />
        </>
      );
    case "info":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11.5V16" />
          <path d="M12 8h.01" />
        </>
      );
  }
}

export function OsIcon({
  name,
  size = 16,
  ...rest
}: { name: OsIconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size}
      {...rest}
    >
      {geometry(name)}
    </svg>
  );
}
