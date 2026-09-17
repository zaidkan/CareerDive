import type { OsAppId } from "./browserState.js";

const APPS: ReadonlyArray<{ id: Exclude<OsAppId, "desktop">; label: string; glyph: string }> = [
  { id: "browser", label: "Browser", glyph: "B" },
  { id: "files", label: "Files", glyph: "F" },
  { id: "notes", label: "Notes", glyph: "N" },
];

export function Desktop({ onOpen }: { onOpen: (app: OsAppId) => void }) {
  return (
    <section aria-label="Desktop" className="os-desktop">
      <ul className="os-icons">
        {APPS.map((app) => (
          <li key={app.id}>
            <button
              aria-label={`Open ${app.label}`}
              className="os-icon"
              onClick={() => {
                onOpen(app.id);
              }}
              type="button"
            >
              <span aria-hidden="true" className="os-icon-glyph">
                {app.glyph}
              </span>
              <span>{app.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="os-desktop-hint">Select an app to open it. The shift continues in the Browser.</p>
    </section>
  );
}
