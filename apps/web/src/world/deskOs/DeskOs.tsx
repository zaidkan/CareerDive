import type { AvailableAction, ClientView } from "@sim/schemas";
import { LockScreen } from "./LockScreen.js";
import { OpsConsole } from "./OpsConsole.js";
import { BrowserApp } from "./os/BrowserApp.js";
import { Desktop } from "./os/Desktop.js";
import { FileExplorer, type OpenableFile } from "./os/FileExplorer.js";
import { Notes } from "./os/Notes.js";
import { Taskbar } from "./os/Taskbar.js";
import { WindowFrame } from "./os/WindowFrame.js";
import type { OsAppId } from "./os/browserState.js";
import { useOsSession } from "./osSession.js";
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
  maximized?: boolean;
  osFullscreen?: boolean;
  onLoginSuccess: () => void;
  onStand: () => void;
  onOsFullscreen: () => void;
  mutationState?: MutationState;
  onRetryMutation?: () => void;
}) {
  const { state, dispatch } = useOsSession();
  // Single-active-window model: exactly one app fills the workspace.
  const activeApp = state.activeApp;
  const setActiveApp = (app: OsAppId) => {
    dispatch({ type: "set_active_app", app });
  };
  // Opened files live at session level so they survive overlay unmount/remount.
  const openFile = state.openFile;
  const setOpenFile = (file: OpenableFile | null) => {
    dispatch({ type: "set_open_file", file });
  };
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
          <WindowFrame active app="browser" title="Browser">
            <BrowserApp opsConsole={opsConsole} />
          </WindowFrame>
        </div>
        <div hidden={locked || activeApp !== "files"}>
          <WindowFrame active app="files" title="Files">
            <FileExplorer onOpenFile={openFileInNotes} />
          </WindowFrame>
        </div>
        <div hidden={locked || activeApp !== "notes"}>
          <WindowFrame active app="notes" title="Notes">
            <Notes openFile={openFile} />
          </WindowFrame>
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
          <LockScreen onLoginSuccess={onLoginSuccess} />
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
