import { expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  applyAction,
  createInitialWorldState,
  foldActionLog,
  matchingGuides,
  availableActions,
} from "../src/index.js";
function scannerReady() {
  let state = createInitialWorldState(
    "guide-query",
    24,
    {},
    loadDefaultCybersecurityPack(),
  );
  for (const [id, eventId] of [
    ["read_handoff", "handoff-1"],
    ["acknowledge_handoff", "handoff-1"],
    ["review_alert", "suspicious-login-1"],
    ["inspect_login_context", "suspicious-login-1"],
    ["review_alert", "routine-alert-1"],
  ] as const) {
    state = applyAction(state, { id, eventId, actorId: "user" }).state;
  }
  return state;
}
it.each([
  "nothing-matches-this",
  "Check whether vuln-scan-03 discovery on the finance VLAN at Monday 10:18 is inside SCAN-FIN-MON 10:00–12:00",
  "Office VPN",
])(
  "rejects no-match or wrong-case procedure %s without time, energy, logs or progress changes",
  (freeText) => {
    const state = scannerReady();
    const snapshot = structuredClone(state);
    expect(() =>
      applyAction(state, {
        id: "search_knowledge_base",
        eventId: "routine-alert-1",
        actorId: "user",
        freeText,
      }),
    ).toThrow(/No relevant guide matched/);
    expect(state).toEqual(snapshot);
    expect(
      availableActions(state).some(
        (a) =>
          a.eventId === "routine-alert-1" && a.id === "search_knowledge_base",
      ),
    ).toBe(true);
  },
);
it("records a real case-specific keyword match and deterministically advances the procedure step", () => {
  const state = scannerReady();
  const query = "scanner";
  expect(
    matchingGuides(
      Object.values(state.artifacts),
      query,
      "routine-alert-1",
    ).some((a) => a.id === "scanner-window"),
  ).toBe(true);
  const result = applyAction(state, {
    id: "search_knowledge_base",
    eventId: "routine-alert-1",
    actorId: "user",
    freeText: query,
  });
  expect(
    result.state.events.find((e) => e.id === "routine-alert-1")
      ?.completedActionIds,
  ).toContain("search_knowledge_base");
  expect(result.state.simClock).toBe(state.simClock + 10);
  expect(result.state.workplace.energy.current).toBe(
    state.workplace.energy.current - 3,
  );
  expect(
    foldActionLog(state, [
      {
        sequence: 1,
        interaction: {
          type: "action",
          action: {
            id: "search_knowledge_base",
            eventId: "routine-alert-1",
            actorId: "user",
            freeText: query,
          },
        },
      },
    ]),
  ).toEqual(result.state);
});
