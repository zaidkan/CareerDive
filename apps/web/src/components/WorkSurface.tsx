import { useEffect, useRef, useState } from "react";
import type { WorkSystemId } from "@sim/schemas";
import { SystemToolPanel } from "./SystemToolPanel.js";
import { GuidancePanel } from "./GuidancePanel.js";
import { OperationalMessages, type ModeProps } from "./shared.js";
import { getShiftGuidance, getTutorialStep } from "../guidance.js";
import { WORK_SYSTEMS, formatShiftClock, systemLabel } from "../systems.js";
import {
  deriveSystemState,
  eventsForSystem,
  remainingMinutes,
  systemOpenCounts,
} from "../workstation.js";
import { COMPANY } from "../world/company.js";
import { CaseRail } from "./CaseRail.js";
import { NotificationBanner } from "./NotificationBanner.js";
import { MutationStatus } from "./MutationStatus.js";

export function WorkSurface({
  view,
  onAction,
  onTaskAttempt,
  onNotification,
  onWorkplaceInteraction,
  mutationState,
  onRetryMutation,
  guided = false,
}: ModeProps & { guided?: boolean }) {
  const guidance = getShiftGuidance(view);
  const tutorialStep = guided ? getTutorialStep(view) : null;
  const recommendedSystemId = guidance?.systemId;

  const initialSystem: WorkSystemId =
    recommendedSystemId ??
    (view.events.some(({ systemId }) => systemId === "email")
      ? "email"
      : (view.events[0]?.systemId ?? "alert_dashboard"));
  const [systemId, setSystemId] = useState<WorkSystemId>(initialSystem);
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  function openSystem(target: WorkSystemId, eventId?: string) {
    setSystemId(target);
    setSelectedEventId(eventId);
    setFocusRequest((value) => value + 1);
  }
  useEffect(() => {
    if (focusRequest > 0) headingRef.current?.focus();
  }, [focusRequest]);

  useEffect(() => {
    if (recommendedSystemId && guided) {
      setSystemId(recommendedSystemId);
      setSelectedEventId(undefined);
    }
  }, [guided, recommendedSystemId, tutorialStep?.id]);

  const { systemEvents, selectedEvent, contextualActions, highlightActionId } =
    deriveSystemState(view, systemId, { selectedEventId, guidance });
  const openCounts = systemOpenCounts(view);

  return (
    <section className="workplace-shell" aria-labelledby="workspace-title">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{COMPANY.name} · security operations desk</p>
          <h2 id="workspace-title">Your workstation</h2>
        </div>
        <time
          className="shift-clock"
          aria-label={`${String(view.simClock)} simulated minutes elapsed`}
        >
          <span>Shift time</span>
          <strong>{formatShiftClock(view.simClock)}</strong>
          <span>{view.simClock} minutes in</span>
        </time>
      </header>
      <MutationStatus state={mutationState ?? {}} {...(onRetryMutation ? { onRetry: onRetryMutation } : {})} />

      <NotificationBanner
        {...(mutationState ? { mutationState } : {})}
        notifications={view.notifications}
        {...(onNotification
          ? {
              onNotification: async (notification, response) => {
                if (response !== "handle") {
                  await onNotification(notification, response);
                  return;
                }
                await onNotification(notification, response, () => {
                  openSystem(notification.systemId, notification.eventId);
                });
              },
            }
          : {})}
      />

      <CaseRail
        onResume={({ eventId, systemId: targetSystem }) => {
          openSystem(targetSystem, eventId);
        }}
        view={view}
      />

      <GuidancePanel
        body="Pick a tab below to open a tool. Read what is there, then take one action at a time."
        guidance={guidance}
        onGoToSystem={openSystem}
        currentSystemId={systemId}
        title={guided ? "Practice · what to do next" : "What to do next"}
      />

      <nav className="system-dock" aria-label="Work systems">
        {WORK_SYSTEMS.map((system) => {
          const count = openCounts[system.id];
          const hot = eventsForSystem(view, system.id).some(
            (event) =>
              (event.priority === "high" || event.priority === "urgent") &&
              event.status === "active",
          );
          const recommended = recommendedSystemId === system.id;
          return (
            <button
              aria-pressed={systemId === system.id}
              data-hot={hot ? "true" : "false"}
              data-recommended={recommended ? "true" : "false"}
              key={system.id}
              onClick={() => {
                openSystem(system.id);
              }}
              type="button"
            >
              <span>{system.label}</span>
              <small>{count > 0 ? `${String(count)} open` : system.hint}</small>
            </button>
          );
        })}
      </nav>

      <div className="workspace-grid">
        <aside
          className="work-queue"
          aria-label={`${systemLabel(systemId)} items`}
        >
          <p className="eyebrow">{systemLabel(systemId)}</p>
          {systemEvents.length === 0 ? (
            <p className="queue-empty">
              Nothing here right now. Try another tab.
            </p>
          ) : (
            systemEvents.map((event) => (
              <button
                aria-pressed={selectedEvent?.id === event.id}
                className="queue-item"
                data-priority={event.priority}
                key={event.id}
                onClick={() => {
                  openSystem(systemId, event.id);
                }}
                type="button"
              >
                <span className="sev" aria-hidden="true" />
                <span className="queue-body">
                  <span>{event.title}</span>
                  <small>
                    {event.priority} · due in{" "}
                    {remainingMinutes(event.deadlineAt, view.simClock)}m
                  </small>
                </span>
              </button>
            ))
          )}
        </aside>

        <article className="work-detail">
          {selectedEvent ? (
            <>
              <div className="detail-meta">
                <span className={`status status-${selectedEvent.status}`}>
                  {selectedEvent.status.replaceAll("_", " ")}
                </span>
                <span>
                  Due in{" "}
                  {remainingMinutes(selectedEvent.deadlineAt, view.simClock)}{" "}
                  minutes
                </span>
              </div>
              <h3 ref={headingRef} tabIndex={-1}>{selectedEvent.title}</h3>
              <p>{selectedEvent.summary}</p>
              {selectedEvent.resolution ? (
                <p className="resolution-note">{selectedEvent.resolution}</p>
              ) : null}
              <SystemToolPanel
                actions={contextualActions}
                {...(highlightActionId ? { highlightActionId } : {})}
                onAction={onAction}
                {...(mutationState ? { mutationState } : {})}
                {...(onTaskAttempt ? { onTaskAttempt } : {})}
                {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
                selectedEventId={selectedEvent.id}
                systemId={systemId}
                view={view}
              />
            </>
          ) : (
            <>
              <h3 ref={headingRef} tabIndex={-1}>{systemLabel(systemId)}</h3>
              <p>
                {contextualActions.length > 0
                  ? "Select an item on the left, or use the suggested action above."
                  : "Nothing assigned here yet. Check another tab."}
              </p>
              <SystemToolPanel
                actions={contextualActions}
                {...(highlightActionId ? { highlightActionId } : {})}
                onAction={onAction}
                {...(mutationState ? { mutationState } : {})}
                {...(onTaskAttempt ? { onTaskAttempt } : {})}
                {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
                systemId={systemId}
                view={view}
              />
            </>
          )}
        </article>
      </div>

      <OperationalMessages messages={view.operationalMessages} />
    </section>
  );
}
