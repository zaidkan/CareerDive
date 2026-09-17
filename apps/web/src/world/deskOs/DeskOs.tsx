import type { AvailableAction, ClientView } from "@sim/schemas";
import { useState } from "react";
import { LockScreen } from "./LockScreen.js";
import { OpsConsole } from "./OpsConsole.js";
import { BrowserApp } from "./os/BrowserApp.js";
import { Desktop } from "./os/Desktop.js";
import { FileExplorer, type OpenableFile } from "./os/FileExplorer.js";
import { Notes } from "./os/Notes.js";
import { Taskbar } from "./os/Taskbar.js";
import type { OsAppId } from "./os/browserState.js";
import type {
  NotificationHandler,
  TaskAttemptHandler,
  WorkplaceInteractionHandler,
} from "../../components/shared.js";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";

export function DeskOs({
  phase,
  view,
  onAction,
  onTaskAttempt,
  onNotification,
  onWorkplaceInteraction,
  guided = false,
  maximized = false,
  osFullscreen = false,
  onLoginSuccess,
  onStand,
  onOsFullscreen,
  mutationState = EMPTY_MUTATION_STATE,
  onRetryMutation,
}: {
  phase: "desk_login" | "seated_monitor" | "focus_desk";
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
  onNotification?: NotificationHandler;
  onWorkplaceInteraction?: WorkplaceInteractionHandler;
  guided?: boolean;
  maximized?: boolean;
  osFullscreen?: boolean;
  onLoginSuccess: () => void;
  onStand: () => void;
  onOsFullscreen: () => void;
  mutationState?: MutationState;
  onRetryMutation?: () => void;
}) {
  // Single-active-window model: exactly one app fills the workspace.
  const [activeApp, setActiveApp] = useState<OsAppId>("browser");
  // Opened files live at shell level so they survive app switches.
  const [openFile, setOpenFile] = useState<OpenableFile | null>(null);
  const locked = phase === "desk_login";

  const openFileInNotes = (file: OpenableFile) => {
    setOpenFile(file);
    setActiveApp("notes");
  };

  const opsConsole = (
    <OpsConsole
      phase={phase}
      view={view}
      onAction={onAction}
      {...(onTaskAttempt ? { onTaskAttempt } : {})}
      {...(onNotification ? { onNotification } : {})}
      {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
      guided={guided}
      mutationState={mutationState}
      {...(onRetryMutation ? { onRetryMutation } : {})}
    />
  );

  return (
    <div
      className={`desk-os${maximized ? " desk-os-max" : ""}${osFullscreen ? " desk-os-os-fs" : ""}${locked ? " desk-os-locked" : " desk-os-shell"}`}
      data-desk-os="true"
    >
      {/* Ops console stays mounted while locked so tab state matches the
          pre-login mount behavior; the locked pane hides it. */}
      <div className="os-workspace" hidden={locked}>
        <div hidden={locked || activeApp !== "desktop"}>
          <Desktop onOpen={setActiveApp} />
        </div>
        <div hidden={locked || activeApp !== "browser"}>
          <BrowserApp opsConsole={opsConsole} />
        </div>
        <div hidden={locked || activeApp !== "files"}>
          <FileExplorer onOpenFile={openFileInNotes} />
        </div>
        <div hidden={locked || activeApp !== "notes"}>
          <Notes openFile={openFile} />
        </div>
      </div>
      {locked ? (
        <div className="desk-os-body">
          <div className="desk-os-window-actions">
            <button
              aria-pressed={osFullscreen}
              className="desk-os-ghost"
              onClick={onOsFullscreen}
              type="button"
            >
              Expand workstation
            </button>
            <button className="desk-os-ghost" onClick={onStand} type="button">
              Leave desk
            </button>
          </div>
          <LockScreen onLoginSuccess={onLoginSuccess} onStand={onStand} />
        </div>
      ) : (
        <Taskbar
          activeApp={activeApp}
          simClock={view.simClock}
          osFullscreen={osFullscreen}
          onSelect={setActiveApp}
          onOsFullscreen={onOsFullscreen}
          onStand={onStand}
        />
      )}
    </div>
  );
}
