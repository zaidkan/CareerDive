import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { describe, expect, it } from "vitest";
import { applyWorkplaceInteraction, createInitialWorldState, toClientView } from "../src/index.js";

describe("client artifact serialization", () => {
  it("reveals email body only after canonical opening, without spending time or energy", () => {
    const initial = createInitialWorldState("email-open", 42, {}, loadDefaultCybersecurityPack());
    const before = toClientView(initial).artifacts.find(({ id }) => id === "handoff-email");
    expect(before?.observed).toBe(false);
    expect(before).not.toHaveProperty("body");
    const opened = applyWorkplaceInteraction(initial, { type: "open_artifact", artifactId: "handoff-email" }).state;
    expect(initial.observedArtifactIds).not.toContain("handoff-email");
    expect(opened.simClock).toBe(initial.simClock);
    expect(opened.workplace.energy).toEqual(initial.workplace.energy);
    expect(toClientView(opened).artifacts.find(({ id }) => id === "handoff-email")?.body).toContain("Did not finish device inventory check");
  });
  it("exposes only approved inventory identifiers, never unopened record details", () => {
    const state = createInitialWorldState(
      "lookup-privacy",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );
    const artifact = state.artifacts["device-inventory-1"];
    if (!artifact) throw new Error("Missing inventory fixture");
    artifact.metadata.privateDetail = "restricted inventory detail";
    const view = toClientView(state);
    const preview = view.artifacts.find(({ id }) => id === artifact.id);
    expect(preview).toMatchObject({
      lookupKeys: ["unknown-laptop-17"],
      observed: false,
    });
    for (const field of [
      "body",
      "metadata",
      "searchableText",
      "relatedArtifactIds",
    ])
      expect(preview).not.toHaveProperty(field);
    expect(JSON.stringify(view)).not.toMatch(
      /restricted inventory detail|requiredOptionIds|coachOnFailure|successText/,
    );
    // Even explicitly supplied keys are not public on other artifact types or systems.
    const email = state.artifacts["handoff-email"];
    if (!email) throw new Error("Missing email fixture");
    email.metadata.lookupKeys = "private-device";
    expect(
      toClientView(state).artifacts.find(({ id }) => id === email.id),
    ).not.toHaveProperty("lookupKeys");
    artifact.systemId = "email";
    expect(
      toClientView(state).artifacts.find(({ id }) => id === artifact.id),
    ).not.toHaveProperty("lookupKeys");
  });

  it("does not derive lookup identifiers from bodies or arbitrary metadata", () => {
    const state = createInitialWorldState(
      "lookup-no-inference",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );
    const artifact = state.artifacts["device-inventory-1"];
    if (!artifact) throw new Error("Missing inventory fixture");
    artifact.metadata = { privateDevice: "hidden-laptop-17" };
    expect(
      toClientView(state).artifacts.find(({ id }) => id === artifact.id),
    ).not.toHaveProperty("lookupKeys");
    artifact.metadata.lookupKeys = "The device is not enrolled";
    expect(
      toClientView(state).artifacts.find(({ id }) => id === artifact.id),
    ).not.toHaveProperty("lookupKeys");
  });
  it("omits unopened artifact details from the client view", () => {
    const state = createInitialWorldState(
      "serializer-session",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );

    const handoff = toClientView(state).artifacts.find(
      ({ id }) => id === "handoff-email",
    );

    expect(handoff?.observed).toBe(false);
    expect(handoff).not.toHaveProperty("body");
    expect(handoff).not.toHaveProperty("metadata");
    expect(handoff).not.toHaveProperty("searchableText");
  });
});

it("exposes only delivered delayed consequences/callbacks with their originating action", () => {
  const state = createInitialWorldState("delivery", 42, {}, loadDefaultCybersecurityPack());
  state.ledger.push(
    { id: "pending", eventId: "suspicious-login-1", actionId: "dismiss_alert", description: "Not yet delivered", createdAt: 10, dueAt: 50, applied: false },
    { id: "delayed", eventId: "suspicious-login-1", actionId: "dismiss_alert", description: "Related activity appeared", createdAt: 10, dueAt: 50, applied: true },
    { id: "ordinary", eventId: "suspicious-login-1", actionId: "review_alert", description: "Read the alert", createdAt: 10, applied: true },
    { id: "callback", eventId: "suspicious-login-1", actionId: "escalate_alert", description: "Reviewer received the records", createdAt: 60, applied: true },
  );
  state.pendingCallbacks.push({ id: "reviewer", eventId: "suspicious-login-1", actionId: "escalate_alert", delayMinutes: 20, dueAt: 60, applied: true, when: [], author: "reviewer", body: "Reviewer received the records", activationMessages: [], requiredAtCompletion: true });
  const before = structuredClone(state);
  const updates = toClientView(state).consequenceUpdates;
  expect(updates?.map(({ id }) => id)).toEqual(["delayed", "callback"]);
  expect(updates?.[0]).toMatchObject({ body: "Related activity appeared", actionLabel: state.rules.actions.dismiss_alert?.label });
  expect(state).toEqual(before);
});
