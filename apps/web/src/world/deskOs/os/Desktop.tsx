import { LAUNCHABLE_APPS } from "./appCatalog.js";
import type { OsAppId } from "./browserState.js";
import { OsIcon } from "./Icons.js";

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
                <OsIcon name={app.icon} size={22} />
              </span>
              <span>{app.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
