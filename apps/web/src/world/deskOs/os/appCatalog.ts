import type { OsAppId } from "./browserState.js";

export type OsAppDefinition = {
  id: OsAppId;
  /** Taskbar, launcher, and title-bar name. */
  label: string;
  /** Monogram shown until real artwork exists. */
  glyph: string;
  /** One short line describing what the app is for. */
  role: string;
};

const DEFINITIONS: Record<OsAppId, OsAppDefinition> = {
  desktop: {
    id: "desktop",
    label: "Desktop",
    glyph: "D",
    role: "Workspace overview",
  },
  browser: {
    id: "browser",
    label: "Browser",
    glyph: "B",
    role: "SOC Ops Console and intranet",
  },
  files: {
    id: "files",
    label: "Files",
    glyph: "F",
    role: "Workstation documents",
  },
  notes: {
    id: "notes",
    label: "Notes",
    glyph: "N",
    role: "Scratch pad, never assessed",
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
