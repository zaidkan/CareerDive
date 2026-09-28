import { legacyCyberPack } from "./legacy-cyber.js";
import type { SimulationAction, WorldState } from "@sim/schemas";
import { describe, expect, it } from "vitest";
import {
  ActionUnavailableError,
  applyAction,
  applyWorkplaceInteraction,
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "../src/index.js";

const pack = legacyCyberPack();
const eventId = "suspicious-login-1";
const payload = {
  ticketId: `ticket-${eventId}`,
  verifiedEvidence: "Inventory has no enrollment for unknown-laptop-17.",
  uncertainty: "The inventory cannot identify who used the device.",
  followUp: "Ask a reviewer to compare the session and mailbox records.",
  sourceArtifactIds: ["device-inventory-1"],
};

function ready(): WorldState {
  const state = createInitialWorldState("ticket-composer", 17, {}, pack);
  const event = state.events.find(({ id }) => id === eventId);
  if (!event) throw new Error("Missing case");
  event.completedActionIds = [
    "review_alert",
    "inspect_login_context",
    "inspect_account_history",
    "check_device_inventory",
  ];
  return applyWorkplaceInteraction(state, {
    type: "open_artifact",
    artifactId: "device-inventory-1",
  }).state;
}

describe("source-backed ticket composer", () => {
  it("saves a draft, updates fields, submits the real ticket, and replays its sources", () => {
    const initial = ready();
    expect(
      toClientView(initial).availableActions.find(
        ({ id }) => id === "document_ticket",
      ),
    ).toHaveProperty("taskId", "login-ticket-summary");
    expect(
      toClientView(initial).tasks.some(({ kind }) => kind === "build_summary"),
    ).toBe(true);
    const draft: SimulationAction = {
      id: "update_ticket_notes",
      actorId: "user",
      eventId,
      ticketPayload: payload,
    };
    const submitted: SimulationAction = {
      id: "document_ticket",
      actorId: "user",
      eventId,
      ticketPayload: {
        ...payload,
        uncertainty: "Identity remains unverified.",
      },
    };
    const afterDraft = applyAction(initial, draft).state;
    expect(afterDraft.structuredTickets[payload.ticketId]).toMatchObject({
      status: "in_progress",
      sourceArtifactIds: ["device-inventory-1"],
      verifiedEvidence: payload.verifiedEvidence,
    });
    expect(
      afterDraft.events.find(({ id }) => id === eventId)?.linkedTicketId,
    ).toBe(payload.ticketId);
    const final = applyAction(afterDraft, submitted).state;
    expect(final.structuredTickets[payload.ticketId]).toMatchObject({
      status: "pending_review",
      uncertainty: "Identity remains unverified.",
      sourceArtifactIds: ["device-inventory-1"],
    });
    expect(toClientView(final).structuredTickets?.[payload.ticketId]).toEqual(
      final.structuredTickets[payload.ticketId],
    );
    const revised = applyAction(final, {
      ...draft,
      ticketPayload: {
        ...payload,
        followUp: "Review the flagged session with Morgan.",
      },
    }).state;
    expect(revised.structuredTickets[payload.ticketId]).toMatchObject({
      status: "pending_review",
      followUp: "Review the flagged session with Morgan.",
      sourceArtifactIds: ["device-inventory-1"],
    });
    expect(
      foldActionLog(initial, [
        { sequence: 1, interaction: { type: "action", action: draft } },
        { sequence: 2, interaction: { type: "action", action: submitted } },
      ]),
    ).toEqual(final);
  });

  it("rejects missing, unopened, unrelated, duplicate, and stale sources without mutation", () => {
    const initial = ready();
    const before = structuredClone(initial);
    for (const sourceArtifactIds of [
      ["missing"],
      ["scanner-window"],
      ["handoff-email"],
      ["device-inventory-1", "device-inventory-1"],
    ]) {
      expect(() =>
        applyAction(initial, {
          id: "document_ticket",
          actorId: "user",
          eventId,
          ticketPayload: { ...payload, sourceArtifactIds },
        }),
      ).toThrow(ActionUnavailableError);
    }
    expect(() =>
      applyAction(initial, {
        id: "document_ticket",
        actorId: "user",
        eventId,
        ticketPayload: { ...payload, ticketId: "ticket-other" },
      }),
    ).toThrow(ActionUnavailableError);
    const stale = structuredClone(initial);
    stale.observedArtifactIds = [];
    expect(() =>
      applyAction(stale, {
        id: "document_ticket",
        actorId: "user",
        eventId,
        ticketPayload: payload,
      }),
    ).toThrow(ActionUnavailableError);
    const unrelated = structuredClone(initial);
    unrelated.observedArtifactIds.push("handoff-email");
    expect(() =>
      applyAction(unrelated, {
        id: "document_ticket",
        actorId: "user",
        eventId,
        ticketPayload: { ...payload, sourceArtifactIds: ["handoff-email"] },
      }),
    ).toThrow(ActionUnavailableError);
    expect(initial).toEqual(before);
  });

  it("records clarification and escalation in a replayable team thread", () => {
    const initial = ready();
    const ask: SimulationAction = {
      id: "ask_manager",
      actorId: "user",
      eventId,
      freeText: "What check should a reviewer make next?",
    };
    const asked = applyAction(initial, ask).state;
    expect(asked.teamMessages?.map(({ author }) => author)).toEqual([
      "player",
      "morgan",
    ]);
    expect(asked.teamMessages?.[0]?.body).toBe(ask.freeText);
    expect(asked.teamMessages?.[1]?.body).not.toContain("personal travel");
    const restrictedContext =
      initial.facts["manager-managed-device-context"]?.content;
    expect(restrictedContext).toBeTruthy();
    expect(asked.teamMessages?.[1]?.body).not.toContain(restrictedContext);
    const document: SimulationAction = {
      id: "document_ticket",
      actorId: "user",
      eventId,
      ticketPayload: payload,
    };
    const documented = applyAction(asked, document).state;
    const escalate: SimulationAction = {
      id: "escalate_alert",
      actorId: "user",
      eventId,
    };
    const escalated = applyAction(documented, escalate).state;
    expect(escalated.teamMessages?.at(-1)).toMatchObject({
      author: "player",
      actionId: "escalate_alert",
      eventId,
    });
    expect(escalated.teamMessages?.at(-1)?.body).toContain(
      "device-inventory-1",
    );
    expect(
      foldActionLog(
        initial,
        [ask, document, escalate].map((action, index) => ({
          sequence: index + 1,
          interaction: { type: "action" as const, action },
        })),
      ),
    ).toEqual(escalated);
  });
});
