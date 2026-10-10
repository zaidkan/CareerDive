import type { AvailableAction, ClientView } from "@sim/schemas";
import { useEffect, useRef } from "react";
import "./workspace.css";
import { LockScreen } from "./LockScreen.js";
import { OpsConsole } from "./OpsConsole.js";
import { OsIcon } from "./os/Icons.js";
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
  const workspaceRef = useRef<HTMLDivElement>(null);
  const wasLockedRef = useRef(phase === "desk_login");
  const locked = phase === "desk_login";
  useEffect(() => {
    if (wasLockedRef.current && !locked)
      workspaceRef.current?.focus({ preventScroll: true });
    wasLockedRef.current = locked;
  }, [locked]);

  return (
    <div
      className={`desk-os desk-workspace${maximized ? " desk-os-max" : ""}${osFullscreen ? " desk-os-os-fs" : ""}${locked ? " desk-os-locked" : " desk-os-shell"}`}
      data-desk-os="true"
    >
      <header className="workspace-header">
        <strong>
          Verdaly <span>· Analyst workspace</span>
        </strong>
        <div className="workspace-controls">
          <button
            aria-pressed={osFullscreen}
            className="desk-os-ghost"
            onClick={onOsFullscreen}
            type="button"
          >
            <OsIcon name="expand" size={16} /> Expand workstation
          </button>
          <button className="desk-os-ghost" onClick={onStand} type="button">
            <OsIcon name="exit" size={16} /> Leave desk
          </button>
        </div>
      </header>
      <div
        aria-label="Verdaly workstation ready"
        className="workspace-content"
        hidden={locked}
        ref={workspaceRef}
        role="group"
        tabIndex={-1}
      >
        {!locked ? (
          <OpsConsole
            view={view}
            onAction={onAction}
            {...(onTaskAttempt ? { onTaskAttempt } : {})}
            {...(onNotification ? { onNotification } : {})}
            {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
            mutationState={mutationState}
            {...(onRetryMutation ? { onRetryMutation } : {})}
          />
        ) : null}
      </div>
      {locked ? <LockScreen onLoginSuccess={onLoginSuccess} /> : null}
    </div>
  );
}
