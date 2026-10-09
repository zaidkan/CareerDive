import { sourceBundle } from "./reasoning-options.js";
import type {
  DomainEffect,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";
import { consequence } from "./effects.js";
import { resolveActionEffect } from "./effects.js";
import {
  ensureNotificationsForEvent,
  wakeSnoozedNotifications,
} from "./notifications.js";

export function activatePendingEvents(
  state: WorldState,
  actionId: SimulationActionId,
  effects: DomainEffect[],
): void {
  for (const pendingEvent of state.events) {
    if (
      pendingEvent.status === "pending" &&
      (state.simClock >= pendingEvent.triggeredAt ||
        (pendingEvent.id === "shift-handoff-1" &&
          Object.values(state.structuredTickets).some(
            (t) => t.reasoning?.caseFindings !== undefined,
          ) &&
          [
            "suspicious-login-1",
            "routine-alert-1",
            "access-request-1",
            "login-help-1",
          ].every((id) =>
            state.events.some(
              (e) =>
                e.id === id &&
                ["resolved", "escalated", "expired"].includes(e.status),
            ),
          )))
    ) {
      pendingEvent.status = "active";
      ensureNotificationsForEvent(state, pendingEvent.id);
      for (const message of state.rules.eventTemplates[pendingEvent.templateId]
        ?.activationMessages ?? []) {
        const note = consequence(state, pendingEvent.id, actionId, message);
        state.ledger.push(note);
        effects.push({ type: "consequence_recorded", consequenceId: note.id });
      }
      const entry = consequence(
        state,
        pendingEvent.id,
        actionId,
        `New work arrived: ${pendingEvent.title}.`,
      );
      state.ledger.push(entry);
      effects.push({
        type: "consequence_recorded",
        consequenceId: entry.id,
      });
    }
  }
}

export function expireOverdueEvents(state: WorldState): void {
  for (const activeEvent of state.events) {
    if (
      activeEvent.status === "active" &&
      state.simClock > activeEvent.deadlineAt
    ) {
      activeEvent.status = "expired";
      activeEvent.resolution =
        "The work remained incomplete when its operational deadline passed.";
      state.hidden.taskBacklog = Math.max(0, state.hidden.taskBacklog - 1);
    }
  }
}

export function applyDueConsequences(
  state: WorldState,
  effects: DomainEffect[],
  settleRequired = false,
): void {
  for (const entry of state.ledger) {
    const affectedEvent = state.events.find(({ id }) => id === entry.eventId);
    const effectSpec = affectedEvent
      ? resolveActionEffect(state, affectedEvent, entry.actionId).consequence
      : undefined;
    if (
      !entry.applied &&
      entry.dueAt !== undefined &&
      (state.simClock >= entry.dueAt ||
        (settleRequired && effectSpec?.requiredAtCompletion))
    ) {
      entry.applied = true;
      if (
        affectedEvent?.status === "resolved" &&
        effectSpec?.escalateOnApply === true
      ) {
        affectedEvent.status = "escalated";
        if (
          effectSpec.escalateResolution &&
          !affectedEvent.resolution?.includes(effectSpec.escalateResolution)
        ) {
          affectedEvent.resolution = [
            affectedEvent.resolution,
            effectSpec.escalateResolution,
          ]
            .filter(Boolean)
            .join("\n");
        }
        effects.push({
          type: "event_escalated",
          eventId: affectedEvent.id,
        });
      }
    }
  }
}

/** Runs only authored callbacks. Settlement forces required callbacks, not time. */
export function applyDueCallbacks(
  state: WorldState,
  effects: DomainEffect[],
  settleRequired = false,
): void {
  for (const callback of [...state.pendingCallbacks].sort(
    (a, b) => a.dueAt - b.dueAt,
  )) {
    if (
      callback.applied ||
      (state.simClock < callback.dueAt &&
        !(settleRequired && callback.requiredAtCompletion))
    )
      continue;
    callback.applied = true;
    const source = state.events.find(({ id }) => id === callback.eventId);
    if (!source || source.status === "expired") continue;
    let body = callback.body;
    if (
      callback.id.startsWith("b3-") &&
      state.workplace.handoffSourceArtifactIds
    ) {
      const ids = [
        ...state.workplace.handoffSourceArtifactIds,
        ...(state.workplace.handoffSourceRecordIds ?? []),
      ];
      const inspected = [
        ...(state.workplace.inspectedArtifactIds ?? []),
        ...(state.workplace.inspectedRecordIds ?? []),
      ];
      const required = [
        "login-session-timeline",
        "vpn-context-1",
        "device-inventory-1",
      ];
      const missing = required.filter((id) => !sourceBundle(id, ids).length);
      body = `I received ${String(ids.length)} selected source reference${ids.length === 1 ? "" : "s"}. ${missing.length ? `The handoff does not include ${missing.map((id) => state.artifacts[id]?.title ?? id).join(", ")}; ${missing.some((id) => !sourceBundle(id, inspected).length) ? "some of those sources were not opened during this shift" : "those sources were opened but not attached"}.` : "The timeline, VPN context, and device source are attached."} The saved disposition and follow-up request are available; session ownership still needs independent verification.`;
    }
    // The applied record also feeds the debrief; keep it identical to the received message.
    callback.body = body;
    state.teamMessages ??= [];
    state.teamMessages.push({
      id: `${state.sessionId}-chat-${String(state.teamMessages.length + 1)}`,
      eventId: source.id,
      author: callback.author,
      body,
      actionId: callback.actionId,
      simMinutes: state.simClock,
    });
    const note = consequence(state, source.id, callback.actionId, body);
    state.ledger.push(note);
    effects.push({ type: "consequence_recorded", consequenceId: note.id });
    if (!callback.emitEvent) continue;
    const template = state.rules.eventTemplates[callback.emitEvent];
    if (
      !template ||
      state.events.some(({ templateId }) => templateId === callback.emitEvent)
    )
      continue;
    const spawned = {
      id: template.instanceId,
      templateId: callback.emitEvent,
      title: template.title,
      summary: template.summary,
      priority: template.priority,
      systemId: template.systemId,
      status: template.nonBlockingFollowUp
        ? ("waiting" as const)
        : ("active" as const),
      triggeredAt: state.simClock,
      deadlineAt: state.simClock + template.deadlineMinutes,
      managerConsulted: false,
      completedActionIds: [],
      observedArtifactIds: [],
      followUpRefs: [source.id],
    };
    state.events.push(spawned);
    source.followUpRefs.push(spawned.id);
    for (const message of [
      ...template.activationMessages,
      ...callback.activationMessages,
    ]) {
      const activation = consequence(
        state,
        spawned.id,
        callback.actionId,
        message,
      );
      state.ledger.push(activation);
      effects.push({
        type: "consequence_recorded",
        consequenceId: activation.id,
      });
    }
    if (!template.nonBlockingFollowUp)
      ensureNotificationsForEvent(state, spawned.id);
  }
}

export { wakeSnoozedNotifications };
