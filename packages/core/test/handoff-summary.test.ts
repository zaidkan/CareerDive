import { expect, it } from "vitest";
import { handoffCaseLines, handoffFollowUps } from "../src/handoff-summary.js";

it("keeps recorded case dispositions and excludes future work and handoff bookkeeping", () => {
  const cases = handoffCaseLines([
    { id: "handoff-1", title: "Arrival handoff", status: "resolved" },
    { id: "shift-handoff-1", title: "Next shift", status: "active" },
    { id: "future", title: "Future work", status: "pending" },
    { id: "login", title: "Login", status: "escalated" },
    { id: "scanner", title: "Scanner", status: "resolved", resolution: "The approved window matched. Ownership remains unverified." },
    { id: "access", title: "Access", status: "active" },
  ], {
    "ticket-login": { ticketId: "ticket-login", linkedWorkItemIds: ["login"], status: "pending_review", entityRefs: [], evidenceFactIds: [] },
    "ticket-scanner": { ticketId: "ticket-scanner", linkedWorkItemIds: ["scanner"], status: "closed", entityRefs: [], evidenceFactIds: [] },
  });
  expect(cases.map(({ eventId }) => eventId)).toEqual(["login", "scanner", "access"]);
  expect(cases[0]?.label).toContain("senior review pending");
  expect(cases[1]?.label).toContain("bounded to what was checked");
  expect(cases[1]?.detail).toBe("The approved window matched.");
  expect(cases[2]?.label).toContain("still needs a final decision");
});

it("preserves unresolved follow-up obligations after a work item is resolved", () => {
  expect(handoffFollowUps([
    { id: "open", title: "Scanner", status: "active" },
    { id: "access", title: "Access", status: "resolved", resolution: "Owner approval remains pending. No access was granted." },
    { id: "login", title: "Login", status: "resolved", resolution: "The confirmed fix worked." },
    { id: "future", title: "Future work", status: "pending" },
  ], [])).toEqual([
    "Scanner still needs a final decision.",
    "Access: Owner approval remains pending.",
  ]);
});
