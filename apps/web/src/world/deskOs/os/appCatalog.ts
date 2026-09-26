import type { OsAppId } from "./browserState.js";
import type { OsIconName } from "./Icons.js";

export type OsAppDefinition = {
  id: OsAppId;
  /** Taskbar, launcher, and title-bar name. */
  label: string;
  /** Shared icon language mark for every surface. */
  icon: OsIconName;
  /** One short line describing what the app is for. */
  role: string;
};

const DEFINITIONS: Record<OsAppId, OsAppDefinition> = {
  desktop: {
    id: "desktop",
    label: "Desktop",
    icon: "app-desktop",
    role: "Workspace overview",
  },
  browser: {
    id: "browser",
    label: "Browser",
    icon: "app-browser",
    role: "SOC Ops Console and intranet",
  },
  files: {
    id: "files",
    label: "Files",
    icon: "app-files",
    role: "Workstation documents",
  },
  notes: {
    id: "notes",
    label: "Notes",
    icon: "app-notes",
    role: "Private scratch pad",
  },
};

/** Taskbar order, pinned first. */
export const OS_APPS: ReadonlyArray<OsAppDefinition> = [
  DEFINITIONS.desktop,
  DEFINITIONS.browser,
  DEFINITIONS.files,
  DEFINITIONS.notes,
];

export function appDefinition(id: OsAppId): OsAppDefinition {
  return DEFINITIONS[id];
}

/** Apps the player can launch from the desktop workspace. */
export const LAUNCHABLE_APPS: ReadonlyArray<OsAppDefinition> = [
  DEFINITIONS.browser,
  DEFINITIONS.files,
  DEFINITIONS.notes,
];
