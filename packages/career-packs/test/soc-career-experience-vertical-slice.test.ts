import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "../src/index.js";
import type {
  DatasetId,
  QueryFilter,
  SimulationAction,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";
import { ActionLogEntrySchema } from "@sim/schemas";
import {
  ActionUnavailableError,
  applyAction,
  applyTaskAttempt,
  applyWorkplaceInteraction,
  createInitialWorldState,
  discoverEvidenceFacts,
  foldActionLog,
  toClientView,
} from "@sim/core";
import * as core from "@sim/core";

// ---------------------------------------------------------------------------
// SOC CAREER-EXPERIENCE VERTICAL SLICE — high-level integration/acceptance
// contract. TEST-ONLY lane.
//
// Scope: encodes the product goal "the player should feel what SOC analyst
// work is like — handoff, triage, ambiguous evidence, multi-system queries,
// zero-result searches, coworkers, documentation, context switching,
// consequences — never a quiz over hidden answer keys."
//
// Canonical sources: docs/superpowers/specs/interactivity-and-content-depth-
// design.md and docs/superpowers/specs/soc-structured-content-pack.md. Tests
// drive the REAL default pack via canonical actions only; they never depend
// on authored option IDs or answer keys.
//
// GREEN  = capability exists in the current runtime/pack (asserted).
// RED    = capability is genuinely missing; the test FAILS today with a
//          descriptive RED marker. Missing capability + smallest production
//          behavior to turn it green is in the marker message.
// ---------------------------------------------------------------------------

const HANDOFF = "handoff-1";
const LOGIN = "suspicious-login-1";
const ROUTINE = "routine-alert-1";

// ---------------------------------------------------------------------------
// Helpers — canonical full-world simulation against the real pack.
// ---------------------------------------------------------------------------

function world(sessionId = "soc-slice"): WorldState {
  return createInitialWorldState(sessionId, 7, {}, loadDefaultCybersecurityPack());
}

function action(
  id: SimulationActionId,
  eventId: string,
  freeText?: string,
): SimulationAction {
  return { id, eventId, actorId: "player", ...(freeText ? { freeText } : {}) };
}

function queryAction(datasetId: DatasetId, filters: QueryFilter): SimulationAction {
  return { id: "query_records", actorId: "player", queryPayload: { datasetId, filters } };
}

function perform(world: WorldState, ...next: SimulationAction[]): WorldState {
  let state = world;
  for (const n of next) {
    state = applyAction(state, n).state;
  }
  return state;
}

function event(state: WorldState, eventId: string) {
  const found = state.events.find(({ id }) => id === eventId);
  if (!found) throw new Error(`event ${eventId} missing`);
  return found;
}

/** Head of shift + main-case investigation through all four inspection acts. */
function fullyInvestigated(start: WorldState): WorldState {
  return perform(
    start,
    action("read_handoff", HANDOFF),
    action("acknowledge_handoff", HANDOFF),
    action("review_alert", LOGIN),
    queryAction("auth", { user: "j.patel@example.com" }),
    queryAction("devices", { assignedUser: "j.patel@example.com" }),
    queryAction("alerts", { state: "open" }),
    action("inspect_login_context", LOGIN),
    action("inspect_account_history", LOGIN),
    action("check_device_inventory", LOGIN),
  );
}

// ---------------------------------------------------------------------------
// RED markers — expectations for capabilities that are genuinely missing.
// Each throws a descriptive marker; the test fails until production lands the
// behavior. When the capability is landed the marker stops throwing and the
// test turns green without editing the suite.
// ---------------------------------------------------------------------------

function requireAuthoredEvidenceFacts(state: WorldState): Record<string, unknown> {
  const definitions = state.rules.evidenceFacts;
  if (definitions && Object.keys(definitions).length > 0) return definitions;
  throw new Error(
    "RED[social-slice §6]: canonical Evidence Facts must be producible through " +
      "real shift play. Today the real pack ships zero `scenario.evidenceFacts` " +
      "definitions AND the engine exposes no record-open act for structured-dataset " +
      "rows, so a fully investigated A-1042 world still yields `[]` from " +
      "`discoverEvidenceFacts`. Smallest production behavior: author the pack " +
      "evidenceFacts AND land a canonical open/observe act for dataset record IDs " +
      "so provenance records resolve.",
  );
}

function requireRoutineGatesReleased(state: WorldState): object {
  const routineTasks = Object.values(state.rules.tasks).filter(
    ({ eventTemplateId }) => eventTemplateId === "routine_alert_review",
  );
  if (
    routineTasks.length > 0 &&
    routineTasks.every((task) => task.releasesActionGate === true)
  ) {
    return routineTasks;
  }
  throw new Error(
    "RED[social-slice §2]: routine closure must not require selecting a hidden " +
      "answer key. Today `routine-alert-1` is still gated behind legacy " +
      "option-based tasks (scanner-alert-compare, scanner-run-compare, " +
      "scanner-window-match, scanner-close-note) while the investigation chain " +
      "was released, so a player who wants to close routine work is forced into " +
      "the legacy quiz surface. Smallest production behavior: release the routine " +
      "gates (releasesActionGate) or re-author them as procedural checks like the " +
      "investigation path.",
  );
}

function requireStructuredTicketSubstrate(state: WorldState): Record<string, unknown> {
  const store = (state as unknown as { structuredTickets?: unknown }).structuredTickets;
  if (store !== undefined) return store as Record<string, unknown>;
  throw new Error(
    "RED[social-slice §8]: documentation must have a canonical substrate. Today " +
      "`document_ticket` is gated behind a legacy option-based task and writes only " +
      "free-text ticketNotes; there is no schema-backed structured-ticket store that " +
      "survives applyAction/foldActionLog, attaches only discovered Evidence Fact IDs, " +
      "and records disposition without a verdict. Smallest production behavior: land " +
      "the structured-ticket store/reader/validator (frozen contract already at " +
      "packages/schemas/src/ticket.ts).",
  );
}

function requireTopicScopedCoworkerGuidance(): object {
  const coreAny = core as unknown as { managerDialogueForQuestion?: unknown };
  if (typeof coreAny.managerDialogueForQuestion === "function") {
    return coreAny.managerDialogueForQuestion as object;
  }
  throw new Error(
    "RED[social-slice §9]: coworker guidance must be scoped to the player's actual " +
      "question. Today `ask_manager` carries no bounded question/topic payload and " +
      "the reply is a single canned template string per event, so a player cannot " +
      "meaningfully depend on Morgan/Jules for a specific operational question. " +
      "Smallest production behavior: accept an optional bounded question/topic on " +
      "the manager interaction, resolved deterministically to topic-bound guidance " +
      "from public state only.",
  );
}

// ---------------------------------------------------------------------------
// §1 — Shift start: the player reads + acknowledges a canonical handoff.
// ---------------------------------------------------------------------------

describe("section 1 · shift start and handoff", () => {
  it("an incomplete handoff is the first work item and carries released actions", () => {
    const initial = world();
    const view = toClientView(initial);
    const handoffEvent = view.events.find((e) => e.id === HANDOFF);
    expect(handoffEvent?.category).toBe("handoff");
    expect(handoffEvent?.status).toBe("active");

    const handoffActions = view.availableActions.filter((a) => a.eventId === HANDOFF);
    expect(handoffActions.map((a) => a.id)).toContain("read_handoff");
    // Released: no legacy quiz task is bound to the handoff.
    for (const a of handoffActions) expect(a.taskId).toBeUndefined();
    expect(JSON.stringify(view)).not.toMatch(
      /requiredOptionIds|correctOptionIds|expectedAnswer/i,
    );
  });

  it("reading observes the handoff context; acknowledging closes it without grading", () => {
    let state = world();
    state = perform(
      state,
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
    );

    expect(state.observedArtifactIds).toContain("handoff-email");
    const emailPreview = toClientView(state).artifacts.find(
      (a) => a.id === "handoff-email",
    );
    expect(emailPreview?.observed).toBe(true);
    expect(emailPreview?.body).toContain("device inventory check");

    const handoffEvent = event(state, HANDOFF);
    expect(handoffEvent.status).toBe("resolved");
    expect(handoffEvent.resolution).toBeTruthy();

    // The handoff hands off still-unfinished investigation work.
    expect(event(state, LOGIN).status).toBe("active");
    const messages = toClientView(state).operationalMessages;
    expect(JSON.stringify(messages)).not.toMatch(
      /\bcorrect\b|\bincorrect\b|score/i,
    );
  });
});

// ---------------------------------------------------------------------------
// §2 — Routine work exists alongside the main case.
// ---------------------------------------------------------------------------

describe("section 2 · routine work is present, not only A-1042", () => {
  it("a routine scanner alert arrives mid-shift and is real, distinct content", () => {
    let state = world();
    state = perform(
      state,
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
      action("review_alert", LOGIN),
      queryAction("auth", { user: "j.patel@example.com" }),
      queryAction("vpn", {
        user: "j.patel@example.com",
        sourceIp: "203.0.113.44",
        windowStartSimMinutes: 440,
        windowEndSimMinutes: 460,
      }),
    );

    // Handoff 10 + review 10 = 20; two queries carry simClock to 24.
    expect(state.simClock).toBe(24);
    expect(event(state, ROUTINE).status).toBe("pending");

    // Queries advance simClock but never activate pending events themselves;
    // the routine arrives when the NEXT canonical action crosses its trigger.
    state = perform(state, queryAction("devices", { assignedUser: "j.patel@example.com" }));
    expect(state.simClock).toBe(26);
    expect(event(state, ROUTINE).status).toBe("pending");

    state = perform(state, action("inspect_login_context", LOGIN));
    expect(event(state, ROUTINE).status).toBe("active");

    const notice = toClientView(state).notifications.find(
      (n) => n.eventId === ROUTINE,
    );
    expect(notice?.title).toMatch(/scanner alert/i);

    // Routine content is real: the alert queue and scanner dataset hold it.
    state = perform(
      state,
      queryAction("alerts", { state: "open" }),
      queryAction("scanner", { runId: "RUN-FIN-031" }),
    );
    const results = toClientView(state).queryResults;
    const alertIds = results.find((q) => q.datasetId === "alerts")?.records.map((r) => r.id) ?? [];
    expect(alertIds).toEqual(expect.arrayContaining(["A-1042", "A-1180"]));
    expect(alertIds.length).toBeGreaterThan(1);

    const scanner = results.find((q) => q.datasetId === "scanner");
    expect(scanner?.resultIds).toEqual(["RUN-FIN-031"]);
    const run = scanner?.records[0];
    if (run?.datasetId === "scanner") {
      expect(run.changeRef).toBe("SCAN-FIN-MON");
    }

    // Routine content is analyzable through the canonical observation act.
    const opened = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "scanner-window",
    }).state;
    expect(opened.observedArtifactIds).toContain("scanner-window");
    const windowArtifact = toClientView(opened).artifacts.find(
      (a) => a.id === "scanner-window",
    );
    expect(windowArtifact?.body).toMatch(/Mondays 10:00/);
  });

  it("EXPECTED RED — routine closure is not quiz-free (legacy gated chain)", () => {
    expect(requireRoutineGatesReleased(world())).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §3 — Investigation requires multiple independent sources.
// ---------------------------------------------------------------------------

describe("section 3 · multi-source investigation", () => {
  it("no single dataset explains the case; sources yield disjoint records", () => {
    let state = perform(
      world(),
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
      action("review_alert", LOGIN),
    );
    state = perform(
      state,
      queryAction("auth", { user: "j.patel@example.com" }),
      queryAction("devices", { assignedUser: "j.patel@example.com" }),
      queryAction("alerts", { state: "open" }),
      queryAction("vpn", { user: "j.patel@example.com" }),
    );
    const views = toClientView(state).queryResults;
    const byDataset = new Map(views.map((v) => [v.datasetId, v.resultIds]));

    const authIds = byDataset.get("auth");
    const deviceIds = byDataset.get("devices");
    const alertIds = byDataset.get("alerts");
    expect(authIds && authIds.length).toBeGreaterThan(0);
    expect(deviceIds && deviceIds.length).toBeGreaterThan(0);
    expect(alertIds && alertIds.length).toBeGreaterThan(0);

    // Pairwise disjoint: the full picture is never contained in one source.
    const all = [...(authIds ?? []), ...(deviceIds ?? []), ...(alertIds ?? [])];
    expect(new Set(all).size).toBe(all.length);

    // Inspection actions observe distinct facets of the same case.
    state = perform(
      state,
      action("inspect_login_context", LOGIN),
      action("check_device_inventory", LOGIN),
    );
    expect(state.observedArtifactIds).toEqual(
      expect.arrayContaining(["login-context-1", "device-inventory-1"]),
    );
  });
});

// ---------------------------------------------------------------------------
// §4 — Investigation order does not change the outcome.
// ---------------------------------------------------------------------------

describe("section 4 · order-independent investigation", () => {
  function runPath(order: "A" | "B"): WorldState {
    let state = perform(
      world(),
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
      action("review_alert", LOGIN),
    );
    const auth = () => queryAction("auth", { user: "j.patel@example.com" });
    const device = () => queryAction("devices", { assignedUser: "j.patel@example.com" });
    const vpn = () => queryAction("vpn", { user: "j.patel@example.com" });
    return order === "A"
      ? perform(state, auth(), device(), vpn())
      : perform(state, device(), auth(), vpn());
  }

  it("path A and path B reach equivalent canonical investigation state", () => {
    const a = runPath("A");
    const b = runPath("B");

    expect(a.simClock).toBe(b.simClock);
    expect(a.observedArtifactIds).toEqual(b.observedArtifactIds);
    expect(event(a, LOGIN).completedActionIds).toEqual(
      event(b, LOGIN).completedActionIds,
    );

    // Query-by-query equivalent outcome, independent of execution order.
    const summarize = (state: WorldState) =>
      new Map(
        state.queryHistory.map((entry) => [
          `${entry.datasetId}|${JSON.stringify(entry.normalizedFilters)}`,
          { resultIds: entry.resultIds, totalCount: entry.totalCount, truncated: entry.truncated },
        ]),
      );
    expect(summarize(b)).toEqual(summarize(a));

    const av = toClientView(a);
    const bv = toClientView(b);
    expect(bv.events).toEqual(av.events);
    expect(bv.artifacts.map((x) => x.id)).toEqual(av.artifacts.map((x) => x.id));
  });
});

// ---------------------------------------------------------------------------
// §5 — A zero-result search is real, legitimate investigation work.
// ---------------------------------------------------------------------------

describe("section 5 · zero-result search is real work", () => {
  it("an absence query is accepted, recorded canonically, and never graded", () => {
    let state = perform(
      world(),
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
      action("review_alert", LOGIN),
    );
    const before = state.queryHistory.length;

    const zero = perform(
      state,
      queryAction("vpn", {
        user: "j.patel@example.com",
        sourceIp: "203.0.113.44",
        windowStartSimMinutes: 440,
        windowEndSimMinutes: 460,
      }),
    );

    expect(zero.queryHistory.length).toBe(before + 1);
    const entry = zero.queryHistory.at(-1);
    expect(entry?.datasetId).toBe("vpn");
    expect(entry?.totalCount).toBe(0);
    expect(entry?.resultIds).toEqual([]);
    expect(entry?.truncated).toBe(false);

    // Client sees a zero-result view with no error and no feedback about it.
    const view = toClientView(zero);
    const result = view.queryResults.find((q) => q.datasetId === "vpn");
    expect(result?.totalCount).toBe(0);
    expect(result?.records).toEqual([]);
    const messages = view.operationalMessages.join("\n");
    expect(messages).not.toMatch(/\berror\b|\bfailed\b|\binvalid\b/i);
  });
});

// ---------------------------------------------------------------------------
// §6 — Query, observation, and Evidence Fact are distinct canonical acts.
// ---------------------------------------------------------------------------

describe("section 6 · query ≠ observation ≠ Evidence Fact", () => {
  it("querying never opens records; opening an artifact is the observation act", () => {
    let state = perform(
      world(),
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
    );
    const observedBeforeQueries = [...state.observedArtifactIds];
    expect(observedBeforeQueries).toEqual(["handoff-email"]);

    state = perform(state, queryAction("devices", { assignedUser: "j.patel@example.com" }));
    state = perform(state, queryAction("auth", { user: "j.patel@example.com" }));
    expect(state.observedArtifactIds).toEqual(observedBeforeQueries);

    // Observation only happens through the canonical open act.
    state = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "device-inventory-1",
    }).state;
    expect(state.observedArtifactIds).toContain("device-inventory-1");

    const artifact = toClientView(state).artifacts.find(
      (a) => a.id === "device-inventory-1",
    );
    expect(artifact?.observed).toBe(true);
    expect(artifact?.body).toContain("unknown-laptop-17");

    // Query result rows are strict-validated and carry no observation marker.
    state = perform(state, queryAction("devices", { assignedUser: "j.patel@example.com" }));
    for (const qr of toClientView(state).queryResults) {
      for (const row of qr.records) {
        expect(Object.keys(row)).not.toContain("observed");
      }
    }
  });

  it("EXPECTED RED — real shift play produces canonical Evidence Facts", () => {
    const state = fullyInvestigated(world());
    const definitions = requireAuthoredEvidenceFacts(state);
    const discovered = discoverEvidenceFacts(state);
    expect(definitions).toBeDefined();
    expect(discovered.length).toBeGreaterThan(0);
    for (const entry of discovered) {
      expect(entry.attachedToTicketIds).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// §7 — The player-visible experience carries no grading or answer keys.
// ---------------------------------------------------------------------------

describe("section 7 · ambiguity, no immediate grading", () => {
  it("no grading vocabulary or answer-key metadata is ever serialized", () => {
    const views: string[] = [];
    let state = world();
    const capture = (s: WorldState) => views.push(JSON.stringify(toClientView(s)));
    capture(state);

    state = perform(
      state,
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
      action("review_alert", LOGIN),
    );
    capture(state);

    state = perform(
      state,
      queryAction("auth", { user: "j.patel@example.com" }),
      queryAction("vpn", {
        user: "j.patel@example.com",
        sourceIp: "203.0.113.44",
        windowStartSimMinutes: 440,
        windowEndSimMinutes: 460,
      }),
      action("inspect_login_context", LOGIN),
      action("inspect_account_history", LOGIN),
      action("check_device_inventory", LOGIN),
      action("ask_manager", LOGIN),
    );
    capture(state);

    const text = views.join("\n");
    expect(text).not.toMatch(
      /requiredOptionIds|correctOptionIds|expectedAnswer|expectedEvidence|relevance|\bscore\b|\bcorrect\b|\bincorrect\b|right answer|wrong answer|clue found/i,
    );
  });
});

// ---------------------------------------------------------------------------
// §8 — Documentation has a canonical substrate; free text is not truth.
// ---------------------------------------------------------------------------

describe("section 8 · documentation substrate", () => {
  it("free text cannot manufacture or mutate world truth (GREEN)", () => {
    const state = fullyInvestigated(world());
    const beforeFacts = discoverEvidenceFacts(state);

    const written = perform(
      state,
      action("update_ticket_notes", LOGIN, "The session was compromised by an attacker."),
    );

    expect(written.ticketNotes[LOGIN]).toMatch(/compromised/);
    // No truth actually changed.
    expect(event(written, LOGIN).status).toBe("active");
    expect(event(written, LOGIN).resolution).toBeUndefined();
    expect(written.queryHistory).toEqual(state.queryHistory);
    expect(discoverEvidenceFacts(written)).toEqual(beforeFacts);
  });

  it("EXPECTED RED — documentation requires a canonical structured substrate", () => {
    const state = fullyInvestigated(world());
    const store = requireStructuredTicketSubstrate(state);
    expect(Object.keys(store)).toContain(LOGIN);
  });
});

// ---------------------------------------------------------------------------
// §9 — Coworkers give bounded context; never correctness; no truth mutation.
// ---------------------------------------------------------------------------

describe("section 9 · coworker dependency", () => {
  it("the player may request bounded manager context while working the case", () => {
    let state = perform(
      world(),
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
      action("review_alert", LOGIN),
    );
    state = perform(state, action("ask_manager", LOGIN));

    const messages = toClientView(state).operationalMessages;
    expect(messages.some((m) => /Morgan recommends/i.test(m))).toBe(true);
    // One-shot: asking again is no longer offered.
    const stillOffered = toClientView(state).availableActions.some(
      (a) => a.id === "ask_manager" && a.eventId === LOGIN,
    );
    expect(stillOffered).toBe(false);
  });

  it("coworker guidance never reveals the answer or grades the player", () => {
    let state = perform(
      world(),
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
      action("review_alert", LOGIN),
    );
    state = perform(state, action("ask_manager", LOGIN));
    const guidance = toClientView(state)
      .operationalMessages.filter((m) => /Morgan recommends/i.test(m))
      .join("\n");

    expect(guidance).not.toMatch(/\bcorrect\b|\bincorrect\b|score/i);
    expect(guidance).not.toMatch(/j\.?\s*patel/i);
    // Procedural only — no claim about who signed in.
    expect(guidance).not.toMatch(/the account (is|was) (compromised|safe)\b/i);
  });

  it("asking a coworker does not mutate hidden truth from free text", () => {
    let state = perform(
      world(),
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
      action("review_alert", LOGIN),
    );
    const before = {
      facts: state.facts,
      resolution: event(state, LOGIN).resolution,
      completedActionIds: [...event(state, LOGIN).completedActionIds],
    };
    state = perform(
      state,
      action("ask_manager", LOGIN, "Can you tell me who actually signed in?"),
    );

    expect(event(state, LOGIN).resolution).toBe(before.resolution);
    expect(event(state, LOGIN).completedActionIds).toEqual(before.completedActionIds);
    expect(event(state, LOGIN).status).toBe("active");
  });

  it("EXPECTED RED — coworker guidance is scoped to the player's actual question", () => {
    expect(requireTopicScopedCoworkerGuidance()).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §10 — Return to work: investigation context survives context switching.
// ---------------------------------------------------------------------------

describe("section 10 · context continuity after switching work", () => {
  it("interrupting the main case with routine work does not erase it", () => {
    let state = fullyInvestigated(world());
    state = perform(
      state,
      action("update_notebook", LOGIN, "Session owner unverified; unknown-laptop-17 not enrolled."),
      action("update_ticket_notes", LOGIN, "Auth + device compared; keep watching route coverage."),
    );

    const before = {
      loginCompleted: [...event(state, LOGIN).completedActionIds],
      observed: [...state.observedArtifactIds],
      notebook: state.notebook,
      notes: state.ticketNotes[LOGIN],
      queryHistory: state.queryHistory.map((e) => JSON.stringify(e)),
    };
    const routineBefore = event(state, ROUTINE).status;

    // Context switch into routine work (real, non-quiz routine actions: query,
    // open an artifact, annotate the ticket).
    state = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "scanner-run-log",
    }).state;
    state = perform(
      state,
      queryAction("scanner", { runId: "RUN-FIN-031" }),
      action("update_ticket_notes", ROUTINE, "Compare event time, not delivery time."),
    );

    const mid = toClientView(state);
    expect(mid.events.find((e) => e.id === ROUTINE)?.category).toBe("routine");
    expect(mid.events.find((e) => e.id === LOGIN)?.category).toBe("main_case");

    // Return to the main case: case observations are preserved (routine work
    // legitimately adds its own observations on top).
    expect(state.observedArtifactIds.slice(0, before.observed.length)).toEqual(
      before.observed,
    );
    expect(
      ["device-inventory-1", "login-context-1", "account-history-1"].every((id) =>
        state.observedArtifactIds.includes(id),
      ),
    ).toBe(true);
    expect(state.notebook).toEqual(before.notebook);
    expect(state.ticketNotes[LOGIN]).toEqual(before.notes);
    expect(event(state, LOGIN).completedActionIds).toEqual(before.loginCompleted);
    expect(state.queryHistory.slice(0, before.queryHistory.length).map((e) => JSON.stringify(e))).toEqual(before.queryHistory);

    const loginActions = toClientView(state).availableActions.filter(
      (a) => a.eventId === LOGIN,
    );
    expect(loginActions.map((a) => a.id)).toEqual(
      expect.arrayContaining(["document_ticket", "dismiss_alert"]),
    );
    expect(routineBefore).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// §11 — Replay: the same action log reproduces identical world + client state.
// ---------------------------------------------------------------------------

describe("section 11 · deterministic replay", () => {
  function shiftScript(): SimulationAction[] {
    return [
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
      action("review_alert", LOGIN),
      queryAction("auth", { user: "j.patel@example.com" }),
      queryAction("devices", { assignedUser: "j.patel@example.com" }),
      queryAction("vpn", { user: "j.patel@example.com" }),
      action("inspect_login_context", LOGIN),
      action("inspect_account_history", LOGIN),
      action("check_device_inventory", LOGIN),
    ];
  }

  function entry(actions: SimulationAction[]) {
    return ActionLogEntrySchema.array().parse(
      actions.map((next, index) => ({
        sequence: index + 1,
        interaction: { type: "action" as const, action: next },
      })),
    );
  }

  it("foldActionLog equals stepwise application, in any fresh world", () => {
    const script = shiftScript();
    const stepwise = perform(world(), ...script);
    const folded = foldActionLog(world(), entry(script));
    expect(folded).toEqual(stepwise);

    const replay2 = foldActionLog(world(), entry(script));
    expect(replay2).toEqual(folded);
    expect(toClientView(replay2)).toEqual(toClientView(folded));
  });
});

// ---------------------------------------------------------------------------
// §12 — Hidden authoring state never reaches the player-visible projection.
// ---------------------------------------------------------------------------

describe("section 12 · hidden state", () => {
  it("client view never serializes authoring, rules, or hidden instance state", () => {
    let state = fullyInvestigated(world());
    state = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "scanner-window",
    }).state;
    state = perform(
      state,
      action("update_notebook", LOGIN, "keep route comparison open"),
      queryAction("scanner", { runId: "RUN-FIN-031" }),
      action("update_ticket_notes", ROUTINE, "Compare approved window before closure."),
    );

    const view = toClientView(state);
    const serialized = JSON.stringify(view);
    for (const forbidden of [
      "templateId",
      "requiredOptionIds",
      "correctOptionIds",
      "expectedAnswer",
      "expectedEvidence",
      "relevance",
      "score",
      "knownBy",
      "notKnownBy",
      "triggeredAt",
      "managerConsulted",
      "progression",
      "taskProgress",
      "queryHistory",
      "normalizedFilters",
      "hiddenAnswer",
      "idealDisposition",
    ]) {
      expect(serialized).not.toMatch(new RegExp(`"${forbidden}"`));
    }

    // Released investigation acts never resurface as quiz tasks; only gated
    // closure/documentation residue can, and it never carries an answer key.
    const releasedActs = new Set([
      "read_handoff",
      "acknowledge_handoff",
      "inspect_login_context",
      "inspect_account_history",
      "check_device_inventory",
    ]);
    const gatedResidue = ["review_alert", "search_knowledge_base", "document_ticket"];
    for (const task of view.tasks) {
      expect(releasedActs.has(task.actionId)).toBe(false);
      expect(gatedResidue).toContain(task.actionId);
      expect(JSON.stringify(task)).not.toMatch(
        /requiredOptionIds|correctOptionIds|expectedAnswer/i,
      );
    }

    // Observed artifacts carry their body; unobserved non-KB artifacts stay
    // preview-only (KB documents intentionally expose searchableText).
    for (const artifact of view.artifacts) {
      if (!artifact.observed && artifact.kind !== "kb_document") {
        expect(artifact.body).toBeUndefined();
      }
    }
    // Every event surfaces a work-item category, never a template id.
    for (const e of view.events) expect(e.category).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// §13 — Career-experience regression assertions A–F.
// ---------------------------------------------------------------------------

describe("section 13 · regression assertions A–F", () => {
  it("A — investigation cannot be replaced by selecting a quiz answer", () => {
    const state = perform(
      world(),
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
      action("review_alert", LOGIN),
    );
    // Released tasks have no bindable quiz surface; attempting one is illegal.
    expect(() =>
      applyTaskAttempt(state, {
        eventId: LOGIN,
        taskId: "login-alert-compare",
        selectedOptionIds: [],
      }),
    ).toThrow(ActionUnavailableError);
  });

  it("B — at least one legitimate investigation step is a zero-result search", () => {
    let state = perform(
      world(),
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
      action("review_alert", LOGIN),
    );
    state = perform(
      state,
      queryAction("vpn", {
        user: "j.patel@example.com",
        sourceIp: "203.0.113.44",
        windowStartSimMinutes: 440,
        windowEndSimMinutes: 460,
      }),
    );
    const entry = state.queryHistory.at(-1);
    expect(entry?.totalCount).toBe(0);
    expect(entry?.resultIds).toEqual([]);
  });

  it("C — multiple independent data sources are usable", () => {
    let state = perform(
      world(),
      action("read_handoff", HANDOFF),
      action("acknowledge_handoff", HANDOFF),
      action("review_alert", LOGIN),
    );
    state = perform(
      state,
      queryAction("auth", { user: "j.patel@example.com" }),
      queryAction("devices", { assignedUser: "j.patel@example.com" }),
    );
    const used = new Set(
      toClientView(state).queryResults.map((q) => q.datasetId),
    );
    expect(used.has("auth")).toBe(true);
    expect(used.has("devices")).toBe(true);
  });

  it("D — documentation or free text never manufactures world truth", () => {
    let state = fullyInvestigated(world());
    const before = {
      facts: state.facts,
      queryHistory: state.queryHistory,
      consensus: event(state, LOGIN).resolution,
    };
    state = perform(
      state,
      action("update_ticket_notes", LOGIN, "VPN confirmed; account is compromised."),
    );
    expect(state.facts).toEqual(before.facts);
    expect(state.queryHistory).toEqual(before.queryHistory);
    expect(event(state, LOGIN).resolution).toEqual(before.consensus);
    expect(event(state, LOGIN).status).toBe("active");
  });

  it("E — work state survives context switching", () => {
    let state = fullyInvestigated(world());
    state = perform(
      state,
      action("update_notebook", LOGIN, "device check done; route coverage open"),
    );
    const loginCompleted = [...event(state, LOGIN).completedActionIds];
    state = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "scanner-window",
    }).state;
    state = perform(state, queryAction("scanner", { runId: "RUN-FIN-031" }));
    expect(event(state, LOGIN).completedActionIds).toEqual(loginCompleted);
    expect(event(state, LOGIN).status).toBe("active");
    expect(event(state, ROUTINE).status).toBe("active");
  });

  it("F — no correctness grading appears in the player-visible experience", () => {
    let state = fullyInvestigated(world());
    state = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "scanner-run-log",
    }).state;
    state = perform(
      state,
      action("ask_manager", LOGIN),
      queryAction("scanner", { runId: "RUN-FIN-031" }),
      action("update_ticket_notes", ROUTINE, "Compare event time with the approved window."),
    );
    const serialized = JSON.stringify(toClientView(state));
    expect(serialized).not.toMatch(
      /requiredOptionIds|correctOptionIds|expectedAnswer|\bscore\b|\bcorrect\b|\bincorrect\b|right answer|wrong answer|clue found/i,
    );
  });
});