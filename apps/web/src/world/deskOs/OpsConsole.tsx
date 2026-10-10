import { ConfirmAction } from "../../components/tools/ConfirmAction.js";
import { CaseCommunication } from "./CaseCommunication.js";
import { updateWorkspacePresentation } from "./workspaceTransition.js";
import type { AvailableAction, ClientView, WorkSystemId } from "@sim/schemas";
import { useEffect } from "react";
import { getShiftGuidance } from "../../guidance.js";
import { ShiftCheckpoints } from "./ShiftCheckpoints.js";
import { SystemApp } from "./SystemApp.js";
import { OsIcon, type OsIconName } from "./os/Icons.js";
import { useOsSession } from "./osSession.js";
import { MutationStatus } from "../../components/MutationStatus.js";
import { NotificationBanner } from "../../components/NotificationBanner.js";
import { ConsequenceUpdates } from "../../components/ConsequenceUpdates.js";
import type {
  NotificationHandler,
  TaskAttemptHandler,
  WorkplaceInteractionHandler,
} from "../../components/shared.js";
import { formatShiftClock, systemLabel, WORK_SYSTEMS } from "../../systems.js";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";
import { workspaceObjective } from "./workspaceObjective.js";
import { CaseWorkspace } from "./CaseWorkspace.js";

const TOOL_ICONS: Record<WorkSystemId, OsIconName> = {
  alert_dashboard: "alert",
  email: "mail",
  ticket_queue: "ticket",
  knowledge_base: "book",
  team_chat: "chat",
};

/** One workspace, five tools. Navigation never submits a simulation action. */
export function OpsConsole({
  view,
  onAction,
  onTaskAttempt,
  onNotification,
  onWorkplaceInteraction,
  mutationState = EMPTY_MUTATION_STATE,
  onRetryMutation,
}: {
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
  onNotification?: NotificationHandler;
  onWorkplaceInteraction?: WorkplaceInteractionHandler;
  mutationState?: MutationState;
  onRetryMutation?: () => void;
}) {
  const { state, dispatch } = useOsSession();
  const guidance = getShiftGuidance(view);
  const systemId =
    state.workspace?.systemId ?? guidance?.systemId ?? "alert_dashboard";
  const visibleCases = view.events.filter(
    (event) => event.status !== "pending",
  );
  const selectedCase =
    visibleCases.find(({ id }) => id === state.workspace?.eventId) ??
    visibleCases.find(({ id }) => id === (guidance?.eventId ?? guidance?.action?.eventId)) ??
    visibleCases[0];
  const eventId = selectedCase?.id;
  useEffect(() => {
    if (!state.workspace)
      dispatch({
        type: "open_tool",
        focus: false,
        systemId,
        ...(eventId ? { eventId } : {}),
      });
  }, [dispatch, state.workspace, systemId, eventId]);
  const openTool = (next: WorkSystemId, targetEventId = eventId) => {
    void updateWorkspacePresentation(() => {
      dispatch({
        type: "open_tool",
        systemId: next,
        ...(targetEventId ? { eventId: targetEventId } : {}),
      });
    });
  };
  const objective = workspaceObjective(view, eventId);
  const otherWork =
    guidance?.action && guidance.action.eventId !== eventId
      ? guidance.action
      : undefined;
  const nextSystemId = objective.systemId ?? otherWork?.systemId;
  const nextEventId = objective.systemId
    ? objective.eventId
    : otherWork?.eventId;
  const respond: NotificationHandler = async (notification, response) => {
    if (!onNotification) return;
    if (response !== "handle") {
      dispatch({ type: "clear_workspace_notification" });
      await onNotification(notification, response);
      return;
    }
    const requestId = state.nextNotificationRequestId;
    dispatch({
      type: "queue_workspace_notification",
      notificationId: notification.id,
      eventId: notification.eventId,
      systemId: notification.systemId,
    });
    await onNotification(notification, response, () => {
      dispatch({ type: "apply_workspace_notification", requestId });
    });
  };
  return (
    <div className="workspace-console">
      <section className="workspace-spine" aria-label="Current objective">
        <label className="workspace-case-picker">
          Current case
          <select
            aria-label="Current case"
            value={eventId ?? ""}
            onChange={(event) => {
              const id = event.target.value;
              openTool(systemId, id);
            }}
          >
            {!view.events.length ? <option value="">Your shift</option> : null}
            {visibleCases.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
                {event.status === "resolved" || event.status === "expired"
                  ? " · recorded"
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <div
          className="workspace-objective"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <small>{systemLabel(systemId)} open</small>
          <strong>{objective.objective}</strong>
          <span>
            {objective.systemId
              ? `Next stop: ${systemLabel(objective.systemId)}.`
              : otherWork
                ? `Next case: ${view.events.find(({ id }) => id === otherWork.eventId)?.title ?? otherWork.label} · ${systemLabel(otherWork.systemId)}.`
                : "This case has no remaining work step."}
          </span>
        </div>
        {nextSystemId &&
        (nextSystemId !== systemId || nextEventId !== eventId) ? (
          <button
            className="workspace-next"
            type="button"
            onClick={() => {
              openTool(nextSystemId, nextEventId);
            }}
          >
            Go to {systemLabel(nextSystemId)}{" "}
            <OsIcon name="nav-forward" size={16} />
          </button>
        ) : null}
      </section>
      <div className="workspace-layout">
        <nav className="workspace-rail" aria-label="Workstation tools">
          {WORK_SYSTEMS.map((tool) => {
            const next = nextSystemId === tool.id;
            const unread = view.notifications.filter(
              (n) => n.status === "unread" && n.systemId === tool.id,
            ).length;
            return (
              <button
                type="button"
                key={tool.id}
                aria-label={tool.label}
                aria-describedby={`workspace-hint-${tool.id}${unread ? ` workspace-unread-${tool.id}` : ""}`}
                aria-current={systemId === tool.id ? "page" : undefined}
                className="workspace-tool"
                data-next={next || undefined}
                onClick={() => {
                  openTool(tool.id);
                }}
              >
                <OsIcon name={TOOL_ICONS[tool.id]} size={20} />
                <span>
                  {tool.label}
                  <small id={`workspace-hint-${tool.id}`}>
                    {next ? "Next stop" : tool.hint}
                  </small>
                </span>
                {unread ? (
                  <span
                    className="workspace-unread"
                    id={`workspace-unread-${tool.id}`}
                    aria-label={`${String(unread)} unread`}
                  >
                    {unread}
                  </span>
                ) : null}
              </button>
            );
          })}
          <div
            className="workspace-shift-status"
            aria-label="Workstation status"
          >
            <span>Shift {formatShiftClock(view.simClock)}</span>
          </div>
        </nav>
        <div
          className="workspace-panel"
          role="region"
          aria-label={systemLabel(systemId)}
          aria-busy={Boolean(mutationState.pendingKey)}
        >
          <MutationStatus
            compact
            focusSuccess={systemId !== "team_chat"}
            state={mutationState}
            {...(onRetryMutation ? { onRetry: onRetryMutation } : {})}
          />
          {view.notifications.some(({ status }) => status === "unread") ? (
            <aside aria-label="Work notification">
              <NotificationBanner
                notifications={view.notifications}
                {...(onNotification ? { onNotification: respond } : {})}
                mutationState={mutationState}
              />
            </aside>
          ) : null}
          <ConsequenceUpdates view={view} />
          {otherWork ? (
            <button
              className="workspace-other-work"
              type="button"
              onClick={() => {
                openTool(otherWork.systemId, otherWork.eventId);
              }}
            >
              Other work waiting:{" "}
              {view.events.find(({ id }) => id === otherWork.eventId)?.title ??
                otherWork.label}
            </button>
          ) : null}
          {view.caseActions &&
            systemId === "team_chat" &&
            view.availableActions.some((a) => a.id === "complete_shift") && (
              <ConfirmAction
                label="Finish shift"
                pending={Boolean(mutationState.pendingKey)}
                onConfirm={() => {
                  const finish = view.availableActions.find(
                    (a) => a.id === "complete_shift",
                  );
                  if (finish) onAction(finish);
                }}
              >
                <p>
                  Open the evidence-based review of your recorded decisions,
                  claims and corrections.
                </p>
              </ConfirmAction>
            )}
          {eventId &&
          ["handoff-1", "status-check-1", "shift-handoff-1"].includes(
            eventId,
          ) &&
          view.caseActions ? (
            <CaseCommunication
              key={eventId}
              focusRequestId={state.workspace?.requestId ?? 0}
              view={view}
              eventId={eventId}
              systemId={systemId}
              pending={Boolean(mutationState.pendingKey)}
              onAction={onAction}
              onOpenSystem={openTool}
              onWorkplaceInteraction={onWorkplaceInteraction}
            />
          ) : eventId &&
            [
              "suspicious-login-1",
              "routine-alert-1",
              "access-request-1",
              "login-help-1",
            ].includes(eventId) &&
            view.caseActions ? (
            <CaseWorkspace
              key={eventId}
              view={view}
              eventId={eventId}
              systemId={systemId}
              onAction={onAction}
              mutationState={mutationState}
              onOpenSystem={openTool}
              focusRequestId={state.workspace?.requestId ?? 0}
              {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
            />
          ) : (
            <SystemApp
              view={view}
              systemId={systemId}
              onAction={onAction}
              guidance={guidance}
              onOpenSystem={openTool}
              {...(eventId ? { focusEventId: eventId } : {})}
              focusRequestId={state.workspace?.requestId ?? 0}
              mutationState={mutationState}
              {...(onTaskAttempt ? { onTaskAttempt } : {})}
              {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
            />
          )}
          {systemId === "ticket_queue" ? (
            <details className="workspace-scratchpad">
              <summary>Personal scratchpad (optional)</summary>
              <p>
                Private to this browser session. These notes are not assessed.
              </p>
              <label htmlFor="workspace-scratch">Scratch notes</label>
              <textarea
                id="workspace-scratch"
                rows={5}
                value={state.notesText}
                onChange={(event) => {
                  dispatch({
                    type: "set_notes_text",
                    text: event.target.value,
                  });
                }}
              />
            </details>
          ) : null}
          {systemId === "team_chat" ? (
            <details className="workspace-checkpoints">
              <summary>Shift checkpoints</summary>
              <ShiftCheckpoints
                view={view}
                onOpenEmail={() => {
                  openTool("email");
                }}
              />
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
