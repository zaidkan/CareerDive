import type { AvailableAction, ClientView } from "@sim/schemas";
import { LockScreen } from "./LockScreen.js";
import { OpsConsole } from "./OpsConsole.js";
import { BrowserApp } from "./os/BrowserApp.js";
import { Desktop } from "./os/Desktop.js";
import { FileExplorer, type OpenableFile } from "./os/FileExplorer.js";
import { Notes } from "./os/Notes.js";
import { Taskbar } from "./os/Taskbar.js";
import type {
  NotificationHandler,
  TaskAttemptHandler,
  WorkplaceInteractionHandler,
} from "../../components/shared.js";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";
import type { OsSessionAction, OsSessionState } from "./osSession.js";

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
  session,
  onSessionAction,
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
  /** Session-scoped OS state owned above the LaptopOverlay mount (A1). */
  session: OsSessionState;
  onSessionAction: (action: OsSessionAction) => void;
}) {
  const activeApp = session.activeApp;
  const openFile = session.openFile;
  const locked = phase === "desk_login";

  const openFileInNotes = (file: OpenableFile) => {
    onSessionAction({ type: "open_file_in_notes", file });
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
      data-testid="desk-os"
    >
      {/* Ops console stays mounted while locked so tab state matches the
          pre-login mount behavior; the locked pane hides it. */}
      <div className="os-workspace" hidden={locked}>
        <div hidden={locked || activeApp !== "desktop"}>
          <Desktop
            onOpen={(app) => {
              onSessionAction({ type: "set_active_app", app });
            }}
          />
        </div>
        <div hidden={locked || activeApp !== "browser"}>
          <BrowserApp
            history={session.browserHistory}
            onHistory={(action) => {
              onSessionAction({ type: "browser", action });
            }}
            opsConsole={opsConsole}
          />
        </div>
        <div hidden={locked || activeApp !== "files"}>
          <FileExplorer
            fs={session.fakeFs}
            onFsChange={(fs) => {
              onSessionAction({ type: "set_fake_fs", fs });
            }}
            onOpenFile={openFileInNotes}
          />
        </div>
        <div hidden={locked || activeApp !== "notes"}>
          <Notes
            onTextChange={(text) => {
              onSessionAction({ type: "set_scratch_notes", text });
            }}
            openFile={openFile}
            text={session.scratchNotes}
          />
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
          onSelect={(app) => {
            onSessionAction({ type: "set_active_app", app });
          }}
          onOsFullscreen={onOsFullscreen}
          onStand={onStand}
        />
      )}
    </div>
  );
}
