export type FsFolderId = "desktop" | "documents" | "downloads";

export interface FsFile {
  id: string;
  name: string;
  body: string;
}

export interface FakeFs {
  folders: ReadonlyArray<{ id: FsFolderId; label: string }>;
  filesByFolder: Record<FsFolderId, FsFile[]>;
}

export const FS_FOLDERS: FakeFs["folders"] = [
  { id: "desktop", label: "Desktop" },
  { id: "documents", label: "Documents" },
  { id: "downloads", label: "Downloads" },
];

export function initialFakeFs(): FakeFs {
  return {
    folders: FS_FOLDERS,
    filesByFolder: {
      desktop: [
        {
          id: "welcome.txt",
          name: "welcome.txt",
          body: "Verdaly workstation ready.\nOpen the Browser, then the SOC Ops Console bookmark.",
        },
      ],
      documents: [
        {
          id: "shift-brief.txt",
          name: "shift-brief.txt",
          body: "Shift brief (personal copy):\n- Read the handoff email first.\n- One action at a time.\n- When unsure, ask Morgan in Team chat.",
        },
        {
          id: "field-notes-draft.txt",
          name: "field-notes-draft.txt",
          body: "Draft scratch:\n- unknown laptop? verify enrollment before claiming anything.\n- screenshots live in the case, not on this disk.",
        },
      ],
      downloads: [
        {
          id: "vpn-setup.txt",
          name: "vpn-setup.txt",
          body: "VPN profile already installed by IT. No action needed.",
        },
      ],
    },
  };
}

export function findFileFolder(fs: FakeFs, fileId: string): FsFolderId | null {
  for (const folder of fs.folders) {
    if (fs.filesByFolder[folder.id].some((file) => file.id === fileId)) return folder.id;
  }
  return null;
}

/** Pure move: relocates a file between folders. No canonical state involved. */
export function moveFile(fs: FakeFs, fileId: string, toFolder: FsFolderId): FakeFs {
  const fromFolder = findFileFolder(fs, fileId);
  if (!fromFolder || fromFolder === toFolder) return fs;
  const moving = fs.filesByFolder[fromFolder].find((file) => file.id === fileId);
  if (!moving) return fs;
  return {
    ...fs,
    filesByFolder: {
      ...fs.filesByFolder,
      [fromFolder]: fs.filesByFolder[fromFolder].filter((file) => file.id !== fileId),
      [toFolder]: [...fs.filesByFolder[toFolder], moving],
    },
  };
}
