import type { AvailableAction, ClientView } from "@sim/schemas";
import { useEffect, useState } from "react";
import { getShiftGuidance } from "../../guidance.js";
import { CalendarPanel, DashboardHome } from "./DashboardHome.js";
import { LockScreen } from "./LockScreen.js";
import { SystemApp } from "./SystemApp.js";
import { APP_TABS, type DeskOsTab } from "./tabs.js";
import { CaseRail } from "../../components/CaseRail.js";
import { MutationStatus } from "../../components/MutationStatus.js";
import { NotificationBanner } from "../../components/NotificationBanner.js";
import type {
  NotificationHandler,
  TaskAttemptHandler,
  WorkplaceInteractionHandler,
} from "../../components/shared.js";
import { formatShiftClock } from "../../systems.js";
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
  const guidance = getShiftGuidance(view);
  const initialTab: DeskOsTab =
    guidance?.systemId ??
    (view.events.some(({ systemId }) => systemId === "email")
      ? "email"
      : "home");
  const [tab, setTab] = useState<DeskOsTab>(
    phase === "desk_login" ? "home" : initialTab,
  );
  const [focusTarget, setFocusTarget] = useState<{
    eventId?: string;
    requestId: number;
  }>();
  const [pendingNotificationTarget, setPendingNotificationTarget] = useState<{
    eventId: string;
    systemId: DeskOsTab;
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
    if (!pendingNotificationTarget) return;
    const notification = view.notifications.find(
      ({ eventId }) => eventId === pendingNotificationTarget.eventId,
    );
    if (notification?.status === "unread") return;
    setTab(pendingNotificationTarget.systemId);
    setFocusTarget({
      eventId: pendingNotificationTarget.eventId,
      requestId: pendingNotificationTarget.requestId,
    });
    setPendingNotificationTarget(undefined);
  }, [pendingNotificationTarget, view.notifications]);

  useEffect(() => {
    if (phase !== "desk_login" && guidance?.systemId && guided) {
      setTab(guidance.systemId);
    }
  }, [guided, guidance?.systemId, phase]);

  const locked = phase === "desk_login";
  const activeTab = APP_TABS.find((item) => item.id === tab) ?? APP_TABS[0];

  return (
    <div
      className={`desk-os${maximized ? " desk-os-max" : ""}${osFullscreen ? " desk-os-os-fs" : ""}${locked ? " desk-os-locked" : ""}`}
      data-desk-os="true"
    >
      <div className="desk-os-chrome">
        <div className="desk-os-traffic" aria-hidden="true">
          <span className="desk-os-dot desk-os-dot-close" />
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
            <small>Energy</small> Energy {view.workplace.energy.current}/
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
            <NotificationBanner
              mutationState={mutationState}
              notifications={view.notifications}
              onNotification={async (notification, response) => {
                if (response !== "handle") {
                  await onNotification?.(notification, response);
                  return;
                }
                await onNotification?.(notification, response, () => {
                  setPendingNotificationTarget((current) => ({
                    eventId: notification.eventId,
                    systemId: notification.systemId,
                    requestId: (current?.requestId ?? 0) + 1,
                  }));
                });
              }}
            />
            <CaseRail
              onResume={({ eventId, systemId }) => {
                openTab(systemId, eventId);
              }}
              view={view}
            />
          </>
        ) : null}
        {locked ? (
          <LockScreen onLoginSuccess={onLoginSuccess} onStand={onStand} />
        ) : tab === "home" ? (
          <DashboardHome
            guidance={guidance}
            guided={guided}
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
            guided={guided}
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
