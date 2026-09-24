import type { ReactNode } from "react";
import { WindowFrame } from "./WindowFrame.js";
import type { OsAppId } from "./browserState.js";

/**
 * One title bar for every workstation window so the desktop reads as a single
 * OS. Backed by WindowFrame; controls render only when W1 wires handlers.
 */
export function WindowChrome({
  app,
  title,
  subtitle,
  toolbar,
  active,
  maximized,
  onMinimize,
  onToggleMaximize,
  onClose,
  children,
}: {
  app: OsAppId;
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  active?: boolean;
  maximized?: boolean;
  onMinimize?: () => void;
  onToggleMaximize?: () => void;
  onClose?: () => void;
  children?: ReactNode;
}) {
  return (
    <WindowFrame
      {...(active ? { active } : {})}
      app={app}
      {...(maximized ? { maximized } : {})}
      {...(onClose ? { onClose } : {})}
      {...(onMinimize ? { onMinimize } : {})}
      {...(onToggleMaximize ? { onToggleMaximize } : {})}
      {...(subtitle ? { subtitle } : {})}
      title={title}
      {...(toolbar ? { toolbar } : {})}
    >
      {children}
    </WindowFrame>
  );
}
