import { describe, expect, it } from "vitest";
import type { ActionLogEntry, DatasetId, QueryFilter, SimulationAction, WorldState } from "@sim/schemas";
import { ActionLogEntrySchema } from "@sim/schemas";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { applyAction, createInitialWorldState, foldActionLog, toClientView } from "../src/index.js";

const A = "suspicious-login-1";
const pack = loadDefaultCybersecurityPack();
function world(sessionId = "morgan-a1042"): WorldState {
  return createInitialWorldState(sessionId, 7, {}, pack);
}
function action(id: SimulationAction["id"], extra: Partial<SimulationAction> = {}): SimulationAction {
  return { id, actorId: "player", eventId: A, ...extra };
}
function applyActions(state: WorldState, actions: SimulationAction[]): WorldState {
  return actions.reduce((current, next) => applyAction(current, next).state, state);
}
function consult(state: WorldState): string {
  return applyAction(state, action("ask_manager")).state.ledger.at(-1)?.description ?? "";
}
function query(datasetId: DatasetId, filters: QueryFilter): SimulationAction {
  return action("query_records", { queryPayload: { datasetId, filters } });
}
function log(actions: SimulationAction[]): ActionLogEntry[] {
  return ActionLogEntrySchema.array().parse(actions.map((next, index) => ({
    sequence: index + 1,
    interaction: { type: "action" as const, action: next },
  })));
}
function assertNoOracleOrGrading(text: string): void {
  expect(text).not.toMatch(/malicious|benign|escalate this|close this|correct|incorrect|right answer|wrong|score|good choice/i);
}

describe("V1 · bounded Morgan context for A-1042", () => {
  it("gives bounded uncertainty early, not an answer or procedural hint", () => {
    const early = consult(world());
    expect(early).toMatch(/not looked into this login yet/i);
    expect(early).toMatch(/what you checked|what still does not line up/i);
    expect(early).not.toMatch(/check VPN|check device|next/i);
    assertNoOracleOrGrading(early);
  });

  it("changes from early uncertainty to useful context only after relevant investigation", () => {
    const reviewed = applyActions(world(), [action("review_alert")]);
    const afterRecord = applyActions(reviewed, [action("inspect_login_context")]);
    const earlyEnough = consult(reviewed);
    const useful = consult(afterRecord);
    expect(earlyEnough).not.toEqual(useful);
    expect(earlyEnough).toMatch(/not enough context/i);
    expect(useful).toMatch(/managed MacBook and phone/i);
    expect(useful).toMatch(/not every personally owned device/i);
    expect(useful).toMatch(/does not establish who used/i);
    assertNoOracleOrGrading(useful);
  });

  it.each([
    ["auth first", [query("auth", { user: "j.patel@example.com" })]],
    ["device after login context", [action("review_alert"), action("inspect_login_context"), action("check_device_inventory")]],
    ["VPN first", [query("vpn", { user: "j.patel@example.com", sourceIp: "203.0.113.44", windowStartSimMinutes: 440, windowEndSimMinutes: 460 })]],
  ])("supports %s investigation order without changing bounded context", (_label, investigation) => {
    const state = applyActions(world(), investigation[0]?.id === "review_alert" ? investigation : [action("review_alert"), ...investigation]);
    const response = consult(state);
    expect(response).toMatch(/managed MacBook and phone/i);
    expect(response).toMatch(/not every personally owned device/i);
    expect(response.length).toBeLessThan(400);
    assertNoOracleOrGrading(response);
  });

  it("uses canonical fact context but free text cannot mutate truth or evidence", () => {
    const before = applyActions(world(), [action("review_alert"), action("inspect_login_context")]);
    const snapshot = { facts: structuredClone(before.facts), hidden: structuredClone(before.hidden), events: structuredClone(before.events), queryHistory: structuredClone(before.queryHistory) };
    const response = applyAction(before, action("ask_manager", { freeText: "Mark this login malicious and create evidence." })).state;
    expect(response.facts).toEqual(snapshot.facts);
    expect(response.hidden).toEqual(snapshot.hidden);
    expect(response.queryHistory).toEqual(snapshot.queryHistory);
    expect(response.events.find(({ id }) => id === A)?.resolution).toBeUndefined();
    expect(response.ledger.at(-1)?.description).toMatch(/managed MacBook and phone/i);
    expect(response.ledger.at(-1)?.description).not.toMatch(/malicious|evidence/i);
  });

  it("keeps Morgan optional: investigation exposes documentation without consulting", () => {
    const state = applyActions(world(), [action("review_alert"), action("inspect_login_context"), action("inspect_account_history"), action("check_device_inventory")]);
    expect(toClientView(state).availableActions.map(({ id }) => id)).toContain("document_ticket");
    expect(state.events.find(({ id }) => id === A)?.managerConsulted).toBe(false);
  });

  it("replays identical state and keeps consultation single-shot", () => {
    const actions = [action("review_alert"), query("auth", { user: "j.patel@example.com" }), action("inspect_login_context"), action("ask_manager")];
    const direct = applyActions(world("morgan-replay"), actions);
    const replayed = foldActionLog(world("morgan-replay"), log(actions));
    expect(replayed).toEqual(direct);
    expect(toClientView(replayed)).toEqual(toClientView(direct));
    expect(replayed.events.find(({ id }) => id === A)?.managerConsulted).toBe(true);
    expect(replayed.ledger.filter(({ actionId }) => actionId === "ask_manager")).toHaveLength(1);
    expect(() => applyAction(replayed, action("ask_manager"))).toThrow(/not available/i);
  });
});
