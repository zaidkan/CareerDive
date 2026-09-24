/**
 * Canonical Desk OS virtual filesystem.
 *
 * Deterministic, session-local, replay-safe: never reads the host disk and
 * never touches canonical evidence/assessment state. Content is authored
 * workstation material only — procedure and convention, never case answers.
 */

export type FsFolderId = string;

export type FsFileKind = "text" | "markdown" | "log" | "structured" | "file";

export interface FsFile {
  id: string;
  name: string;
  body: string;
  kind: FsFileKind;
}

export interface FsFolder {
  id: FsFolderId;
  /** `null` for the five top-level workstation folders. */
  parentId: FsFolderId | null;
  label: string;
}

export interface FakeFs {
  folders: readonly FsFolder[];
  filesByFolder: Readonly<Record<FsFolderId, readonly FsFile[]>>;
}

/** Breadcrumb root label — not a real folder entry. */
export const FS_ROOT_LABEL = "Files";

export const FS_FALLBACK_FOLDER: FsFolderId = "documents";

function folder(
  id: FsFolderId,
  parentId: FsFolderId | null,
  label: string,
): FsFolder {
  return { id, parentId, label };
}

function file(id: string, name: string, kind: FsFileKind, body: string): FsFile {
  return { id, name, kind, body };
}

export function fileKindOf(name: string): FsFileKind {
  const lower = name.toLowerCase();
  if (lower.endsWith(".md")) return "markdown";
  if (lower.endsWith(".log")) return "log";
  if (lower.endsWith(".csv") || lower.endsWith(".json")) return "structured";
  if (lower.endsWith(".txt")) return "text";
  return "file";
}

export function fileKindLabel(kind: FsFileKind): string {
  switch (kind) {
    case "text":
      return "Text";
    case "markdown":
      return "Markdown";
    case "log":
      return "Log";
    case "structured":
      return "Structured";
    default:
      return "File";
  }
}

/**
 * Deterministic initial tree. Same bytes every session; contents are
 * shift-useful workstation docs derived from pack briefing/conventions —
 * no case answers, no hidden assessment state.
 */
export function initialFakeFs(): FakeFs {
  return {
    folders: [
      folder("desktop", null, "Desktop"),
      folder("documents", null, "Documents"),
      folder("downloads", null, "Downloads"),
      folder("cases", null, "Cases"),
      folder("shared", null, "Shared"),
      folder("documents/templates", "documents", "templates"),
    ],
    filesByFolder: {
      desktop: [
        file(
          "welcome.txt",
          "welcome.txt",
          "text",
          "Verdaly workstation ready.\nOpen the Browser, then the SOC Ops Console bookmark.",
        ),
      ],
      documents: [
        file(
          "shift-brief.txt",
          "shift-brief.txt",
          "text",
          "Shift brief (personal copy):\n- Read the handoff email first.\n- One action at a time.\n- When unsure, ask Morgan in Team chat.",
        ),
        file(
          "field-notes-draft.txt",
          "field-notes-draft.txt",
          "text",
          "Draft scratch:\n- unknown laptop? verify enrollment before claiming anything.\n- screenshots live in the case, not on this disk.",
        ),
        file(
          "handoff-checklist.md",
          "handoff-checklist.md",
          "markdown",
          "# Handoff checklist\n\n- Read the handoff email before opening new work.\n- Keep uncertainty visible — separate what is confirmed from what is open.\n- Follow approval boundaries; ask Morgan when unsure.\n- Leave the next analyst enough context to continue.",
        ),
      ],
      downloads: [
        file(
          "vpn-setup.txt",
          "vpn-setup.txt",
          "text",
          "VPN profile already installed by IT. No action needed.",
        ),
        file(
          "it-onboarding.log",
          "it-onboarding.log",
          "log",
          "07:55:12 profile verdaly-vpn installed\n07:55:14 certificate store updated\n07:55:15 profile ready — no action needed",
        ),
      ],
      cases: [],
      shared: [
        file(
          "team-conventions.md",
          "team-conventions.md",
          "markdown",
          "# Team conventions\n\n- One action at a time.\n- Case evidence and screenshots live in the case system, not on this disk.\n- When unsure, ask Morgan in Team chat.",
        ),
        file(
          "escalation-contacts.csv",
          "escalation-contacts.csv",
          "structured",
          "role,name,channel\nmanager,Morgan,team_chat\nnight_analyst,previous_shift,email",
        ),
      ],
      "documents/templates": [
        file(
          "shift-handoff-template.md",
          "shift-handoff-template.md",
          "markdown",
          "# Shift handoff\n\n## Completed\n-\n\n## Open / uncertain\n-\n\n## Next step\n-",
        ),
      ],
    },
  };
}

export function folderById(fs: FakeFs, id: FsFolderId): FsFolder | null {
  return fs.folders.find((entry) => entry.id === id) ?? null;
}

/** Root → leaf chain for breadcrumbs. Empty when the id is unknown. */
export function folderPath(fs: FakeFs, id: FsFolderId): FsFolder[] {
  const chain: FsFolder[] = [];
  let current = folderById(fs, id);
  let guard = 0;
  while (current && guard < 64) {
    chain.unshift(current);
    current = current.parentId ? folderById(fs, current.parentId) : null;
    guard += 1;
  }
  return chain;
}

/** Renders safely when state holds a stale/unknown folder id. */
export function resolveFolderId(
  fs: FakeFs,
  id: FsFolderId,
  fallback: FsFolderId = FS_FALLBACK_FOLDER,
): FsFolderId {
  return folderById(fs, id) ? id : folderById(fs, fallback) ? fallback : fs.folders[0]?.id ?? fallback;
}

export function topLevelFolders(fs: FakeFs): FsFolder[] {
  return fs.folders.filter((entry) => entry.parentId === null);
}

export function childFolders(fs: FakeFs, parentId: FsFolderId): FsFolder[] {
  return fs.folders.filter((entry) => entry.parentId === parentId);
}

export function parentFolderId(
  fs: FakeFs,
  id: FsFolderId,
): FsFolderId | null {
  return folderById(fs, id)?.parentId ?? null;
}

export function findFileFolder(fs: FakeFs, fileId: string): FsFolderId | null {
  for (const entry of fs.folders) {
    const files = fs.filesByFolder[entry.id] ?? [];
    if (files.some((file) => file.id === fileId)) return entry.id;
  }
  return null;
}

export function findFile(fs: FakeFs, fileId: string): FsFile | null {
  const holder = findFileFolder(fs, fileId);
  if (!holder) return null;
  return (fs.filesByFolder[holder] ?? []).find((file) => file.id === fileId) ?? null;
}

/** Pure move: relocates a file between folders. No canonical state involved. */
export function moveFile(
  fs: FakeFs,
  fileId: string,
  toFolder: FsFolderId,
): FakeFs {
  const fromFolder = findFileFolder(fs, fileId);
  if (!fromFolder || fromFolder === toFolder) return fs;
  if (!folderById(fs, toFolder)) return fs;
  const moving = findFile(fs, fileId);
  if (!moving) return fs;
  const fromFiles = fs.filesByFolder[fromFolder] ?? [];
  const toFiles = fs.filesByFolder[toFolder] ?? [];
  return {
    ...fs,
    filesByFolder: {
      ...fs.filesByFolder,
      [fromFolder]: fromFiles.filter((file) => file.id !== fileId),
      [toFolder]: [...toFiles, moving],
    },
  };
}
