import type { AvailableAction, ClientView } from "@sim/schemas";
import { useEffect, useState } from "react";
import { getShiftGuidance } from "../../guidance.js";
import { CalendarPanel, DashboardHome } from "./DashboardHome.js";
import { SystemApp } from "./SystemApp.js";
import { APP_TABS, type DeskOsTab } from "./tabs.js";
import { useOsSession } from "./osSession.js";
import { CaseRail } from "../../components/CaseRail.js";
import { MutationStatus } from "../../components/MutationStatus.js";
import type {
  TaskAttemptHandler,
  WorkplaceInteractionHandler,
} from "../../components/shared.js";
import { formatShiftClock } from "../../systems.js";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";

/**
 * Tabbed ops console within a Browser window. Its selected tab belongs to the
 * window session; canonical actions still pass through unchanged.
 */
export function OpsConsole({
  windowId,
  phase,
  view,
  onAction,
  onTaskAttempt,
  onWorkplaceInteraction,
  mutationState = EMPTY_MUTATION_STATE,
  onRetryMutation,
}: {
  windowId: string;
  phase: "desk_login" | "seated_monitor" | "focus_desk";
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
  onWorkplaceInteraction?: WorkplaceInteractionHandler;
  mutationState?: MutationState;
  onRetryMutation?: () => void;
}) {
  const { state, dispatch } = useOsSession();
  const guidance = getShiftGuidance(view);
  const initialTab: DeskOsTab =
    guidance?.systemId ??
    (view.events.some(({ systemId }) => systemId === "email")
      ? "email"
      : "home");
  const tab = state.opsTabByWindow[windowId] ?? (phase === "desk_login" ? "home" : initialTab);
  const setTab = (nextTab: DeskOsTab) => {
    dispatch({ type: "set_ops_tab", windowId, tab: nextTab });
  };
  useEffect(() => {
    if (state.opsTabByWindow[windowId] === undefined) {
      dispatch({ type: "set_ops_tab", windowId, tab });
    }
  }, [dispatch, state.opsTabByWindow, tab, windowId]);
  const [focusTarget, setFocusTarget] = useState<{
    eventId?: string;
    requestId: number;
  }>();

  const openTab = (nextTab: DeskOsTab, eventId?: string) => {
    setTab(nextTab);
    setFocusTarget((current) => ({
      ...(eventId ? { eventId } : {}),
      requestId: (current?.requestId ?? 0) + 1,
    }));
  };

  useEffect(() => {
    const target = state.notificationTarget;
    if (target?.phase !== "routed" || target.windowId !== windowId) return;
    setFocusTarget((current) => ({
      eventId: target.eventId,
      requestId: (current?.requestId ?? 0) + 1,
    }));
    dispatch({ type: "clear_notification_target", requestId: target.requestId });
  }, [dispatch, state.notificationTarget, windowId]);

  const locked = phase === "desk_login";
  const activeTab = APP_TABS.find((item) => item.id === tab) ?? APP_TABS[0];

  return (
    <div className="desk-os-console">
      <div className="desk-os-chrome">
        <div className="desk-os-traffic" aria-hidden="true">
          <span className="desk-os-dot desk-os-dot-close" />
          <span className="desk-os-dot desk-os-dot-min" />
          <span className="desk-os-dot desk-os-dot-max" />
        </div>
        <div
          className="desk-os-tabs"
          role="tablist"
          aria-label="Workstation apps"
        >
          {APP_TABS.map((item) => {
            const suggested =
              !locked && guidance?.systemId === item.id && tab !== item.id;
            return (
              <button
                aria-selected={!locked && tab === item.id}
                className={`desk-os-tab${!locked && tab === item.id ? " desk-os-tab-active" : ""}${suggested ? " desk-os-tab-target" : ""}`}
                disabled={locked}
                key={item.id}
                onClick={() => {
                  openTab(item.id);
                }}
                role="tab"
                type="button"
              >
                {item.label}
                {suggested ? (
                  <span className="desk-os-tab-dot">
                    <span className="visually-hidden">suggested next</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="desk-os-address" aria-hidden={locked}>
        <span className="desk-os-secure">Secure</span>
        <span className="desk-os-url">
          {locked ? "verdaly://lock" : activeTab.path}
        </span>
      </div>

      {!locked ? (
        <section
          aria-label="Workstation status"
          className="desk-os-status-strip"
        >
          <span>
            <small>Time</small> {formatShiftClock(view.simClock)}
          </span>
          <span>
            <small>Energy</small> {view.workplace.energy.current}/
            {view.workplace.energy.max}
          </span>
          <span className="desk-os-status-objective">
            <small>Objective</small> {guidance?.headline ?? "Finish the shift"}
          </span>
          <MutationStatus
            state={mutationState}
            {...(onRetryMutation ? { onRetry: onRetryMutation } : {})}
          />
        </section>
      ) : null}

      <div className="desk-os-body">
        {!locked ? (
          <>
            <CaseRail
              onResume={({ eventId, systemId }) => {
                openTab(systemId, eventId);
              }}
              view={view}
            />
          </>
        ) : null}
        {tab === "home" ? (
          <DashboardHome
            guidance={guidance}
            onOpenTab={openTab}
            view={view}
          />
        ) : tab === "calendar" ? (
          <CalendarPanel
            view={view}
            onOpenEmail={() => {
              openTab("email");
            }}
          />
        ) : (
          <SystemApp
            guidance={guidance}
            onAction={onAction}
            mutationState={mutationState}
            {...(onTaskAttempt ? { onTaskAttempt } : {})}
            {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
            {...(focusTarget?.eventId
              ? { focusEventId: focusTarget.eventId }
              : {})}
            focusRequestId={focusTarget?.requestId ?? 0}
            systemId={tab}
            view={view}
          />
        )}
      </div>
    </div>
  );
}
