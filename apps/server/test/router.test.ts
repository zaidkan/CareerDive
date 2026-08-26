import { describe, expect, it } from "vitest";
import {
  DEFAULT_JURISDICTION_POLICIES,
  InMemoryRepository,
  createAppRouter,
  generateSafeNpcReply,
  resolveConsentRequirement,
  type AppContext,
} from "../src/index.js";
import { FakeLlmProvider } from "@sim/ai";
import { createInitialWorldState } from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";

const pack = loadDefaultCybersecurityPack();
const world = (sessionId: string, seed: number) =>
  createInitialWorldState(sessionId, seed, {}, pack);


function setup(
  userId = "user-1",
  provider?: ConstructorParameters<typeof FakeLlmProvider>[0],
) {
  const repository = new InMemoryRepository();
  const router = createAppRouter(repository, {
    ...(provider
      ? { llmProvider: new FakeLlmProvider(provider), aiBudgetUsd: 0.05 }
      : {}),
  });
  const context: AppContext = { userId };
  return {
    repository,
    caller: router.createCaller(context),
    otherCaller: router.createCaller({ userId: "user-2" }),
  };
}

describe("authenticated simulation API", () => {
  it("creates and advances an owned session without accepting an owner id", async () => {
    const { caller } = setup();
    const created = await caller.session.create({
      seed: 42,
      sessionKind: "assessed",
      pacingMode: "standard",
    });

    expect(created.view.availableActions.map(({ id }) => id)).toContain(
      "review_alert",
    );
    const turn = await caller.simulation.performAction({
      sessionId: created.sessionId,
      actionId: "review_alert",
      eventId: "suspicious-login-1",
    });

    expect(turn.view.simClock).toBe(10);
    expect(turn.sequence).toBe(1);
  });

  it("prevents another user from reading or mutating the session", async () => {
    const { caller, otherCaller } = setup();
    const created = await caller.session.create({
      seed: 42,
      sessionKind: "assessed",
      pacingMode: "standard",
    });

    await expect(
      otherCaller.session.get({ sessionId: created.sessionId }),
    ).rejects.toThrow("Session not found");
    await expect(
      otherCaller.simulation.performAction({
        sessionId: created.sessionId,
        actionId: "review_alert",
        eventId: "suspicious-login-1",
      }),
    ).rejects.toThrow("Session not found");
  });

  it("records assessed evidence but never tutorial evidence", async () => {
    const { caller, repository } = setup();
    const assessed = await caller.session.create({
      seed: 1,
      sessionKind: "assessed",
      pacingMode: "standard",
    });
    const tutorial = await caller.session.create({
      seed: 2,
      sessionKind: "tutorial",
      pacingMode: "practice",
    });

    await caller.simulation.performAction({
      sessionId: assessed.sessionId,
      actionId: "review_alert",
      eventId: "suspicious-login-1",
    });
    await caller.simulation.performAction({
      sessionId: tutorial.sessionId,
      actionId: "review_alert",
      eventId: "suspicious-login-1",
    });

    expect(repository.evidenceFor("user-1", assessed.sessionId)).toHaveLength(
      1,
    );
    expect(repository.evidenceFor("user-1", tutorial.sessionId)).toHaveLength(
      0,
    );
  });

  it("records evidence against the exact targeted workplace event", async () => {
    const { caller, repository } = setup();
    const created = await caller.session.create({
      seed: 42,
      sessionKind: "assessed",
      pacingMode: "standard",
    });

    await caller.simulation.performAction({
      sessionId: created.sessionId,
      actionId: "read_handoff",
      eventId: "handoff-1",
    });

    expect(
      repository.evidenceFor("user-1", created.sessionId)[0]?.eventId,
    ).toBe("handoff-1");
  });

  it("rejects a valid action aimed at the wrong event", async () => {
    const { caller } = setup();
    const created = await caller.session.create({
      seed: 42,
      sessionKind: "assessed",
      pacingMode: "standard",
    });

    await expect(
      caller.simulation.performAction({
        sessionId: created.sessionId,
        actionId: "read_handoff",
        eventId: "suspicious-login-1",
      }),
    ).rejects.toThrow("not available");
  });

  it("requires explicit sharing grant and revokes access immediately", async () => {
    const { caller } = setup();
    const grant = await caller.sharing.grant({
      recipientId: "mentor-1",
      categories: ["reflections"],
      expiresAt: "2026-07-22T00:00:00.000Z",
    });

    expect((await caller.sharing.list()).map(({ id }) => id)).toContain(
      grant.id,
    );
    await caller.sharing.revoke({ grantId: grant.id });
    expect(await caller.sharing.list()).toHaveLength(0);
  });

  it("exports owned data and deletes an individual session", async () => {
    const { caller } = setup();
    const created = await caller.session.create({
      seed: 42,
      sessionKind: "assessed",
      pacingMode: "standard",
    });
    await caller.simulation.performAction({
      sessionId: created.sessionId,
      actionId: "review_alert",
      eventId: "suspicious-login-1",
    });

    const exported = await caller.privacy.exportData();
    expect(exported.sessions).toHaveLength(1);
    expect(exported.actionLog).toHaveLength(1);

    await caller.privacy.deleteSession({ sessionId: created.sessionId });
    await expect(
      caller.session.get({ sessionId: created.sessionId }),
    ).rejects.toThrow("Session not found");
  });

  it("routes free text through bounded generated dialogue when configured", async () => {
    const { caller } = setup("user-1", {
      dialogue: "Review the visible alert and document uncertainty.",
      tone: "neutral",
      referencedFactIds: ["alert-visible"],
      proposedMinorStateUpdates: [],
    });
    const created = await caller.session.create({
      seed: 42,
      sessionKind: "assessed",
      pacingMode: "standard",
    });

    const reply = await caller.simulation.submitFreeText({
      sessionId: created.sessionId,
      text: "What should I review?",
    });

    expect(reply).toEqual({
      accepted: true,
      response: "Review the visible alert and document uncertainty.",
    });
  });
});

describe("mixed-age policy and bounded dialogue", () => {
  it("derives guardian requirements from jurisdiction config", () => {
    expect(
      resolveConsentRequirement(DEFAULT_JURISDICTION_POLICIES, "US-NY", 15),
    ).toEqual({
      ageTier: "teen",
      guardianConsentRequired: true,
      institutionalUseAllowed: false,
    });
    expect(
      resolveConsentRequirement(DEFAULT_JURISDICTION_POLICIES, "US-NY", 19)
        .guardianConsentRequired,
    ).toBe(false);
  });

  it("returns approved fallback when generation fails", async () => {
    const provider = {
      generate: async () => {
        throw new Error("provider unavailable");
      },
    };

    const result = await generateSafeNpcReply({
      provider,
      state: world("session-1", 42),
      npcId: "manager",
      userText: "What context should I review?",
      budgetUsd: 0.05,
    });

    expect(result.source).toBe("fallback");
    expect(result.dialogue).toContain("temporarily unavailable");
  });

  it("accepts only permitted facts from generated dialogue", async () => {
    const provider = new FakeLlmProvider({
      dialogue: "Review the visible alert details and document uncertainty.",
      tone: "neutral",
      referencedFactIds: ["alert-visible"],
      proposedMinorStateUpdates: [],
    });

    const result = await generateSafeNpcReply({
      provider,
      state: world("session-1", 42),
      npcId: "manager",
      userText: "What context should I review?",
      budgetUsd: 0.05,
    });

    expect(result.source).toBe("generated");
    expect(result.dialogue).toContain("visible alert");
  });
});
