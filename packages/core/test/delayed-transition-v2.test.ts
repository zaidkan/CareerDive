import { expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { DomainEffect } from "@sim/schemas";
import { createInitialWorldState } from "../src/index.js";
import { applyDueConsequences } from "../src/scheduler.js";

it("applies only resolved-to-escalated delayed transitions and preserves closure", () => {
  const makeState = () => {
    const state = createInitialWorldState("delayed-v2", 7, {}, loadDefaultCybersecurityPack());
    state.simClock = 10;
    state.ledger.push({ id: "delayed", eventId: "suspicious-login-1", actionId: "dismiss_alert",
      description: "Later activity", createdAt: 0, dueAt: 5, applied: false });
    return state;
  };
  const resolved = makeState();
  const caseEvent = resolved.events.find(({ id }) => id === "suspicious-login-1");
  if (!caseEvent) throw new Error("Missing event fixture");
  caseEvent.status = "resolved";
  caseEvent.resolution = "Closed with saved explanation.";
  const effects: DomainEffect[] = [];
  applyDueConsequences(resolved, effects);
  expect(caseEvent.status).toBe("escalated");
  expect(caseEvent.resolution).toContain("Closed with saved explanation.");
  expect(effects).toContainEqual({ type: "event_escalated", eventId: caseEvent.id });

  const expired = makeState();
  const expiredEvent = expired.events.find(({ id }) => id === "suspicious-login-1");
  if (!expiredEvent) throw new Error("Missing event fixture");
  expiredEvent.status = "expired";
  expiredEvent.resolution = "Work expired.";
  const expiredEffects: DomainEffect[] = [];
  applyDueConsequences(expired, expiredEffects);
  expect(expiredEvent.status).toBe("expired");
  expect(expiredEvent.resolution).toBe("Work expired.");
  expect(expired.ledger[0]?.applied).toBe(true);
  expect(expiredEffects).toEqual([]);
});
