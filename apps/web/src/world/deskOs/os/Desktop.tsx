import { COMPANY } from "../../company.js";
import { DESK_LOGIN } from "../../deskLogin.js";
import { LAUNCHABLE_APPS } from "./appCatalog.js";
import type { OsAppId } from "./browserState.js";

export function Desktop({ onOpen }: { onOpen: (app: OsAppId) => void }) {
  return (
    <section aria-label="Desktop" className="os-desktop">
      <div aria-hidden="true" className="os-desktop-wall" />

      <div className="os-desktop-head">
        <p className="eyebrow">{COMPANY.name} · SOC-07</p>
        <h2 className="os-desktop-title">Analyst workstation</h2>
      </div>

      <ul className="os-icons">
        {LAUNCHABLE_APPS.map((app) => (
          <li key={app.id}>
            <button
              aria-label={`Open ${app.label}`}
              className="os-icon"
              data-app={app.id}
              onClick={() => {
                onOpen(app.id);
              }}
              type="button"
            >
              <span aria-hidden="true" className="os-icon-glyph">
                {app.glyph}
              </span>
              <span className="os-icon-label">{app.label}</span>
              <span className="os-icon-role">{app.role}</span>
            </button>
          </li>
        ))}
      </ul>

      <aside aria-label="Workstation session" className="os-desktop-panel">
        <p className="os-desktop-panel-title">Session</p>
        <dl className="os-desktop-facts">
          <div>
            <dt>Analyst</dt>
            <dd>{DESK_LOGIN.username}</dd>
          </div>
          <div>
            <dt>Device</dt>
            <dd>SOC-07</dd>
          </div>
          <div>
            <dt>State</dt>
            <dd className="os-desktop-online">Unlocked</dd>
          </div>
        </dl>
        <p className="os-desktop-hint">
          Select an app to open it. The shift continues in the Browser.
        </p>
      </aside>
    </section>
  );
}
