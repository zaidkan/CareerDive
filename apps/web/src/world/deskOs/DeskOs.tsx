import type { AvailableAction, ClientView } from "@sim/schemas";
import { useEffect, useRef, useState } from "react";
import { LockScreen } from "./LockScreen.js";
import { OpsConsole } from "./OpsConsole.js";
import { BrowserApp } from "./os/BrowserApp.js";
import { Desktop } from "./os/Desktop.js";
import { FileExplorer, type OpenableFile } from "./os/FileExplorer.js";
import { Notes } from "./os/Notes.js";
import { Taskbar } from "./os/Taskbar.js";
import { WindowFrame } from "./os/WindowFrame.js";
import type { OsAppId } from "./os/browserState.js";
import { OsIcon } from "./os/Icons.js";
import { MAX_OPEN_WINDOWS, canOpenWindow, type WorkspaceSize } from "./os/windows.js";
import { useOsSession } from "./osSession.js";
import { NotificationBanner } from "../../components/NotificationBanner.js";
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
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [windowNotice, setWindowNotice] = useState("");
  useEffect(() => {
    if (!windowNotice) return;
    const timer = window.setTimeout(() => { setWindowNotice(""); }, 4000);
    return () => { window.clearTimeout(timer); };
  }, [windowNotice]);
  const workspaceSize = (): WorkspaceSize => ({
    w: workspaceRef.current?.clientWidth || 1024,
    h: workspaceRef.current?.clientHeight || 720,
  });
  const launch = (app: OsAppId) => {
    if (!canOpenWindow(state.windows, app)) {
      setWindowNotice(state.windows.windows.length >= MAX_OPEN_WINDOWS
        ? "Up to 4 windows can be open at once. Close one to open another."
        : "Browser already has 2 windows open.");
      return;
    }
    setWindowNotice("");
    dispatch({ type: "open_window", app, workspace: workspaceSize() });
  };
  const selectPinned = (app: OsAppId) => {
    const existing = state.windows.windows.find((window) => window.app === app);
    if (existing) dispatch({ type: "restore_window", id: existing.id });
    else launch(app);
  };
  const respondToNotification: NotificationHandler = async (notification, response) => {
    if (!onNotification) return;
    if (response !== "handle") {
      if (state.notificationTarget?.notificationId === notification.id) {
        dispatch({ type: "clear_notification_target", requestId: state.notificationTarget.requestId });
      }
      await onNotification(notification, response);
      return;
    }
    const browser = state.windows.windows.find((window) => window.id === state.windows.focusedWindowId && window.app === "browser")
      ?? state.windows.windows.filter((window) => window.app === "browser").sort((a, b) => b.z - a.z)[0];
    if (!browser && !canOpenWindow(state.windows, "browser")) {
      setWindowNotice("Up to 4 windows can be open at once. Close one to open another.");
      return;
    }
    const requestId = state.nextNotificationRequestId;
    dispatch({ type: "queue_notification_target", notificationId: notification.id, windowId: browser?.id ?? null, eventId: notification.eventId, systemId: notification.systemId });
    await onNotification(notification, response, () => {
      dispatch({ type: "route_notification_target", requestId, workspace: workspaceSize() });
    });
  };
  // Opened files live at session level so they survive overlay unmount/remount.
  const openFile = state.openFile;
  const setOpenFile = (file: OpenableFile | null) => {
    dispatch({ type: "set_open_file", file });
  };
  const locked = phase === "desk_login";

  const openFileInNotes = (file: OpenableFile) => {
    setOpenFile(file);
    launch("notes");
  };
  const windowLabel = (id: string, app: "browser" | "files" | "notes") => {
    if (app !== "browser") return app === "files" ? "Files" : "Notes";
    const ordinal = state.windows.windows.filter((entry) => entry.app === "browser").findIndex((entry) => entry.id === id) + 1;
    return ordinal > 1 ? `Browser ${String(ordinal)}` : "Browser";
  };

  const opsConsole = (windowId: string) => (
    <OpsConsole
      windowId={windowId}
      phase={phase}
      view={view}
      onAction={onAction}
      {...(onTaskAttempt ? { onTaskAttempt } : {})}
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
      <div className="os-workspace" hidden={locked} ref={workspaceRef}>
        <Desktop onOpen={launch} />
        {state.windows.windows.filter((window) => !window.minimized).map((window) => (
          <WindowFrame
            key={window.id}
            id={window.id}
            app={window.app}
            title={windowLabel(window.id, window.app)}
            active={state.windows.focusedWindowId === window.id}
            maximized={window.maximized}
            bounds={window.bounds}
            z={window.z}
            onFocus={() => { dispatch({ type: "focus_window", id: window.id }); }}
            onMove={(x, y) => { dispatch({ type: "move_window", id: window.id, x, y, workspace: workspaceSize() }); }}
            onMinimize={() => { dispatch({ type: "minimize_window", id: window.id }); }}
            onToggleMaximize={() => {
              if (window.maximized) {
                dispatch({ type: "restore_maximized_window", id: window.id, workspace: workspaceSize() });
              } else {
                dispatch({ type: "maximize_window", id: window.id });
              }
            }}
            onClose={() => { dispatch({ type: "close_window", id: window.id }); }}
          >
            {window.app === "browser" ? <BrowserApp opsConsole={opsConsole(window.id)} windowId={window.id} />
              : window.app === "files" ? <FileExplorer onOpenFile={openFileInNotes} />
              : <Notes openFile={openFile} />}
          </WindowFrame>
        ))}
        {!locked && view.notifications.some(({ status }) => status === "unread") ? (
          <aside aria-label="Work notification" className="os-notification-host">
            <NotificationBanner notifications={view.notifications} {...(onNotification ? { onNotification: respondToNotification } : {})} mutationState={mutationState} />
          </aside>
        ) : null}
        {windowNotice ? (
          <p aria-atomic="true" className="os-window-notice" role="status">
            <OsIcon name="info" size={15} />
            {windowNotice}
          </p>
        ) : null}
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
              <OsIcon name="expand" size={14} />
              Expand workstation
            </button>
            <button className="desk-os-ghost" onClick={onStand} type="button">
              <OsIcon name="exit" size={14} />
              Leave desk
            </button>
          </div>
          <LockScreen onLoginSuccess={onLoginSuccess} />
        </div>
      ) : (
        <Taskbar
          simClock={view.simClock}
          attention={view.notifications.some(({ status }) => status === "unread")}
          osFullscreen={osFullscreen}
          onLaunch={selectPinned}
          windows={state.windows.windows.map((window) => ({
            key: window.id,
            app: window.app,
            label: windowLabel(window.id, window.app),
            active: state.windows.focusedWindowId === window.id,
            minimized: window.minimized,
          }))}
          onSelectWindow={(id) => { dispatch({ type: "select_taskbar_window", id }); }}
          onOsFullscreen={onOsFullscreen}
          onStand={onStand}
        />
      )}
    </div>
  );
}
