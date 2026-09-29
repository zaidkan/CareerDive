import { createHash } from "node:crypto";
import { loadDefaultCybersecurityPack } from "../packages/career-packs/src/index.js";
import {
  applyAction,
  applyTaskAttempt,
  applyWorkplaceInteraction,
  availableActions,
  createInitialWorldState,
  foldActionLog,
  respondToNotification,
  toClientView,
} from "../packages/core/src/index.js";
import type {
  ActionLogEntry,
  ClientView,
  LoggedInteraction,
  EvidenceSignal,
  SimulationAction,
  SimulationActionId,
  WorldState,
} from "../packages/schemas/src/index.js";
import { buildDecisionReview } from "../apps/server/src/domain/decision-review.js";
import { buildDebrief, evidenceFromAction } from "../packages/evidence/src/index.js";

const seed = 7;
const pack = loadDefaultCybersecurityPack(new Date("2026-09-28T12:00:00.000Z"));
const sessionId = "public-media-cyber-v2-seed-7";

/** One assessed runtime trace; only player-visible projections reach the capture page. */
export function buildCompletedCyberMediaShift(): {
  ticketView: ClientView;
  completedView: ClientView;
  debrief: ReturnType<typeof buildDebrief> & { decisionReview: ReturnType<typeof buildDecisionReview> };
  ticketActions: string[];
  actions: string[];
  ticketActionLogSha256: string;
  actionLogSha256: string;
  ticketStateSha256: string;
  completedStateSha256: string;
  decisionRoute: { b1: string; b2: string; b3: string };
} {
  const initial = createInitialWorldState(sessionId, seed, {}, pack);
  let state = initial;
  const log: ActionLogEntry[] = [];
  const actions: string[] = [];
  const signals: EvidenceSignal[] = [];
  const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const record = (interaction: LoggedInteraction, label: string) => {
    log.push({ sequence: log.length + 1, interaction });
    actions.push(label);
  };
  const open = (artifactId: string) => {
    if (state.observedArtifactIds.includes(artifactId)) return;
    const interaction = { type: "open_artifact" as const, artifactId };
    state = applyWorkplaceInteraction(state, interaction).state;
    record({ type: "workplace_interaction", interaction }, `open_artifact(${artifactId})`);
  };
  const selectAlert = (recordId: string) => {
    const interaction = { type: "open_alert_record" as const, recordId };
    state = applyWorkplaceInteraction(state, interaction).state;
    record({ type: "workplace_interaction", interaction }, `open_alert_record(${recordId})`);
  };
  const act = (id: SimulationActionId, eventId: string, extra: Partial<SimulationAction> = {}) => {
    if (!availableActions(state).some((candidate) => candidate.id === id && candidate.eventId === eventId)) {
      throw new Error(`Unavailable ${id}:${eventId}`);
    }
    const selected = state.workplace.selectedAlertIdsByEvent?.[eventId];
    const source = selected && state.rules.actions[id]?.systemId === "alert_dashboard"
      ? { sourceRecordId: selected, sourceArtifactId: selected === "A-1042" ? "suspicious-login-alert" : "scanner-alert" }
      : {};
    const action: SimulationAction = { id, eventId, actorId: "user", ...source, ...extra };
    state = applyAction(state, action).state;
    record({ type: "action", action }, `performAction(${id}, ${eventId}${action.decisionOptionId ? `, decision=${action.decisionOptionId}` : ""})`);
    signals.push(evidenceFromAction({ state, actionId: id, eventId }));
  };
  const respond = (notificationId: string, response: "handle" | "snooze" | "continue") => {
    const choice = { notificationId, response };
    state = respondToNotification(state, choice);
    record({ type: "notification_response", response: choice }, `respondToNotification(${notificationId}, ${response})`);
  };
  const task = (eventId: string, taskId: string, selectedByStep: Record<string, string[]> = {}) => {
    const definition = state.rules.tasks[taskId];
    if (!definition) throw new Error(`Missing task ${taskId}`);
    while (!state.taskProgress[`${eventId}:${taskId}`]?.completed) {
      const step = definition.steps[state.taskProgress[`${eventId}:${taskId}`]?.currentStep ?? 0];
      if (!step) throw new Error(`Missing step in ${taskId}`);
      for (const artifactId of new Set(step.options.flatMap(({ source }) => source ? [source.artifactId] : []))) open(artifactId);
      const attempt = { eventId, taskId, selectedOptionIds: selectedByStep[step.id] ?? step.requiredOptionIds };
      const turn = applyTaskAttempt(state, attempt);
      if (!turn.accepted) throw new Error(`Unaccepted task attempt ${taskId}:${step.id}`);
      state = turn.state;
      record({ type: "task_attempt", attempt }, `submitTaskAttempt(${taskId}, ${step.id})`);
      if (turn.completed) signals.push(evidenceFromAction({ state, actionId: definition.actionId, eventId }));
    }
  };

  act("read_handoff", "handoff-1");
  act("acknowledge_handoff", "handoff-1", { freeText: "I will check the open sign-in alert and keep the scanner work in view." });
  selectAlert("A-1042");
  act("review_alert", "suspicious-login-1");
  act("inspect_login_context", "suspicious-login-1");
  respond("routine-scanner-arrived", "snooze");
  act("inspect_account_history", "suspicious-login-1");
  act("check_device_inventory", "suspicious-login-1");
  task("access-request-1", "access-authority-check", { "identify-approval-boundary": ["route-with-interim"] });
  task("login-help-1", "employee-login-troubleshooting");
  task("status-check-1", "morgan-midshift-update");
  for (const id of ["suspicious-login-alert", "login-session-timeline", "vpn-context-1", "device-inventory-1", "employee-login-reply"]) open(id);
  act("document_ticket", "suspicious-login-1", {
    decisionOptionId: "escalate-with-comparisons",
    ticketPayload: {
      ticketId: "ticket-suspicious-login-1",
      verifiedEvidence: "A-1042 and S-0741 show the failed-to-successful sequence. The flagged route differs from the earlier VPN session; unknown-laptop-17 is absent from managed inventory.",
      uncertainty: "The session owner and any file or mailbox access remain unverified within the available record window.",
      followUp: "Send exact session and device identifiers, route comparison, and the collection limit to senior review.",
      sourceArtifactIds: ["suspicious-login-alert", "login-session-timeline", "vpn-context-1", "device-inventory-1", "employee-login-reply"],
    },
  });
  const ticket = state.structuredTickets["ticket-suspicious-login-1"];
  if (ticket?.status !== "pending_review" || ticket.sourceArtifactIds?.length !== 5 ||
    state.flags.b1_choice !== "escalate-with-comparisons") {
    throw new Error("A-06 requires a submitted, sourced Cyber 2.0.0 ticket");
  }
  const ticketView = toClientView(state);
  const ticketActions = [...actions];
  const ticketActionLogSha256 = hash(log);
  const ticketStateSha256 = hash(state);

  act("escalate_alert", "suspicious-login-1");
  selectAlert("A-1180");
  act("review_alert", "routine-alert-1");
  act("search_knowledge_base", "routine-alert-1");
  for (const id of ["scanner-alert", "scanner-run-log", "scanner-window"]) open(id);
  act("document_ticket", "routine-alert-1", {
    decisionOptionId: "expected-close-with-monitoring",
    ticketPayload: {
      ticketId: "ticket-routine-alert-1",
      verifiedEvidence: "A-1180 matches RUN-FIN-031 and the approved SCAN-FIN-MON window at the recorded event time.",
      uncertainty: "The run log records discovery connections, not a vulnerability finding.",
      followUp: "Close this expected connection alert and keep later scanner activity in routine monitoring.",
      sourceArtifactIds: ["scanner-alert", "scanner-run-log", "scanner-window"],
    },
  });
  act("dismiss_alert", "routine-alert-1");
  task("shift-handoff-1", "end-shift-continuity", {
    "handoff-checked": ["checks-omitted"],
    "handoff-open-question": ["reviewer-question"],
    "handoff-next-owner": ["correct-omission"],
  });
  act("complete_shift", "shift");
  if (!state.completedActionIds.includes("complete_shift") ||
    state.flags.b2_choice !== "route-with-interim" || state.flags.b3_choice !== "corrected" ||
    !state.taskProgress["shift-handoff-1:end-shift-continuity"]?.correctionHistory[0]?.correctedOptionIds) {
    throw new Error("A-10 requires a completed Cyber 2.0.0 shift with preserved correction");
  }
  if (JSON.stringify(foldActionLog(initial, log)) !== JSON.stringify(state)) {
    throw new Error("Media shift did not replay deterministically");
  }
  const personal = buildDebrief({
    sessionId, careerTitle: pack.career.title, signals, reflections: [],
    consequences: state.ledger.filter(({ applied }) => applied).map(({ description }) => description),
  });
  const debrief = { ...personal, decisionReview: buildDecisionReview(state, log) };
  return {
    ticketView, completedView: toClientView(state), debrief,
    ticketActions, actions, ticketActionLogSha256, actionLogSha256: hash(log), ticketStateSha256,
    completedStateSha256: hash(state),
    decisionRoute: { b1: state.flags.b1_choice ?? "", b2: state.flags.b2_choice ?? "", b3: state.flags.b3_choice ?? "" },
  };
}
