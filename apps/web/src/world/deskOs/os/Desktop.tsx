import { LAUNCHABLE_APPS } from "./appCatalog.js";
import type { OsAppId } from "./browserState.js";

export function Desktop({ onOpen }: { onOpen: (app: OsAppId) => void }) {
  return (
    <section aria-label="Desktop" className="os-desktop">
      <ul className="os-icons">
        {LAUNCHABLE_APPS.map((app) => (
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
      <p className="os-desktop-hint">Open the Browser to continue your shift.</p>
    </section>
  );
}
