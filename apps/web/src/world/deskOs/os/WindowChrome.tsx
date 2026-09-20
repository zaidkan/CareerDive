import type { ReactNode } from "react";
import { appDefinition } from "./appCatalog.js";
import type { OsAppId } from "./browserState.js";

/**
 * One title bar for every workstation window so the desktop reads as a single
 * OS. The window controls are decorative; real window management lands later.
 */
export function WindowChrome({
  app,
  title,
  subtitle,
  toolbar,
}: {
  app: OsAppId;
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
}) {
  const meta = appDefinition(app);
  return (
    <header className="os-window-bar" data-app={app}>
      <div className="os-window-bar-main">
        <span aria-hidden="true" className="os-app-glyph">
          {meta.glyph}
        </span>
        <span className="os-window-identity">
          <strong>{title}</strong>
          {subtitle ? <small>{subtitle}</small> : null}
        </span>
        <span aria-hidden="true" className="os-window-controls">
          <span className="os-window-control os-window-control-min" />
          <span className="os-window-control os-window-control-max" />
          <span className="os-window-control os-window-control-close" />
        </span>
      </div>
      {toolbar ? <div className="os-window-toolbar">{toolbar}</div> : null}
    </header>
  );
}
