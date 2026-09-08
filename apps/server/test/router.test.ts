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
  describe("workplace interactions", () => {
    it("persists an owned workplace interaction as one canonical log entry", async () => {
      const { caller, repository } = setup();
      const created = await caller.session.create({
        seed: 42,
        sessionKind: "assessed",
        pacingMode: "standard",
      });

      const opened = await caller.simulation.performWorkplaceInteraction({
        sessionId: created.sessionId,
        interaction: { type: "open_fridge" },
      });

      expect(opened).toMatchObject({
        sequence: 1,
        feedback: "fridge_opened",
        view: { workplace: { fridgeOpen: true } },
      });
      const stored = await repository.getSession("user-1", created.sessionId);
      expect(stored.actionLog).toHaveLength(1);
      expect(stored.actionLog[0]?.interaction).toEqual({
        type: "workplace_interaction",
        interaction: { type: "open_fridge" },
      });
    });

    it("does not let another owner mutate a workplace session", async () => {
      const { caller, otherCaller, repository } = setup();
      const created = await caller.session.create({
        seed: 42,
        sessionKind: "assessed",
        pacingMode: "standard",
      });

      await expect(
        otherCaller.simulation.performWorkplaceInteraction({
          sessionId: created.sessionId,
          interaction: { type: "open_fridge" },
        }),
      ).rejects.toThrow("Session not found");

      const stored = await repository.getSession("user-1", created.sessionId);
      expect(stored.state.workplace.fridgeOpen).toBe(false);
      expect(stored.actionLog).toHaveLength(0);
    });

    it("rejects invalid and unauthorized interactions without saving or logging", async () => {
      const { caller, repository } = setup();
      const created = await caller.session.create({
        seed: 42,
        sessionKind: "assessed",
        pacingMode: "standard",
      });
      let saveCount = 0;
      const saveSession = repository.saveSession.bind(repository);
      repository.saveSession = async (session) => {
        saveCount += 1;
        await saveSession(session);
      };

      await expect(
        caller.simulation.performWorkplaceInteraction({
          sessionId: created.sessionId,
          interaction: { type: "close_fridge" },
        }),
      ).rejects.toThrow("already closed");
      await expect(
        caller.simulation.performWorkplaceInteraction({
          sessionId: created.sessionId,
          interaction: { type: "open_artifact", artifactId: "restricted" },
        }),
      ).rejects.toThrow("not authorized");

      const stored = await repository.getSession("user-1", created.sessionId);
      expect(stored.state.workplace.fridgeOpen).toBe(false);
      expect(stored.actionLog).toHaveLength(0);
      expect(saveCount).toBe(0);
    });

    it("never produces evidence for workplace interactions in assessed or tutorial sessions", async () => {
      const { caller, repository } = setup();
      const assessed = await caller.session.create({
        seed: 42,
        sessionKind: "assessed",
        pacingMode: "standard",
      });
      const tutorial = await caller.session.create({
        seed: 24,
        sessionKind: "tutorial",
        pacingMode: "practice",
      });

      await caller.simulation.performWorkplaceInteraction({
        sessionId: assessed.sessionId,
        interaction: { type: "open_fridge" },
      });
      await caller.simulation.performWorkplaceInteraction({
        sessionId: tutorial.sessionId,
        interaction: { type: "talk_to_jules", topic: "first_day" },
      });

      expect(repository.evidenceFor("user-1", assessed.sessionId)).toEqual([]);
      expect(repository.evidenceFor("user-1", tutorial.sessionId)).toEqual([]);
    });

    it("limits accepted movement without limiting other interactions", async () => {
      const { caller, repository } = setup();
      const created = await caller.session.create({
        seed: 42,
        sessionKind: "assessed",
        pacingMode: "standard",
      });
      const movement = {
        sessionId: created.sessionId,
        interaction: { type: "movement_exertion", distanceMeters: 5 } as const,
      };

      await caller.simulation.performWorkplaceInteraction(movement);
      await caller.simulation.performWorkplaceInteraction(movement);
      await expect(
        caller.simulation.performWorkplaceInteraction(movement),
      ).rejects.toThrow("Movement submissions are temporarily limited");
      const opened = await caller.simulation.performWorkplaceInteraction({
        sessionId: created.sessionId,
        interaction: { type: "open_fridge" },
      });

      expect(opened.sequence).toBe(3);
      const stored = await repository.getSession("user-1", created.sessionId);
      expect(stored.state.workplace.energy.current).toBe(98);
      expect(stored.actionLog).toHaveLength(3);
    });

    it("does not consume movement capacity when the reducer rejects movement", async () => {
      const { caller, repository } = setup();
      const created = await caller.session.create({
        seed: 42,
        sessionKind: "assessed",
        pacingMode: "standard",
      });
      const stored = await repository.getSession("user-1", created.sessionId);
      stored.state.workplace.energy.current = 0;
      const movement = {
        sessionId: created.sessionId,
        interaction: { type: "movement_exertion", distanceMeters: 5 } as const,
      };

      await expect(
        caller.simulation.performWorkplaceInteraction(movement),
      ).rejects.toThrow("requires available energy");
      stored.state.workplace.energy.current = 2;

      await caller.simulation.performWorkplaceInteraction(movement);
      await caller.simulation.performWorkplaceInteraction(movement);
      expect(
        (await repository.getSession("user-1", created.sessionId)).actionLog,
      ).toHaveLength(2);
    });
  });

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
    const first = await caller.simulation.submitTaskAttempt({
      sessionId: created.sessionId,
      taskId: "login-alert-compare",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["failures-then-success"],
    });
    expect(first.view.simClock).toBe(0);
    expect(first.completed).toBe(false);

    const turn = await caller.simulation.submitTaskAttempt({
      sessionId: created.sessionId,
      taskId: "login-alert-compare",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["geo-hint"],
    });
    expect(turn.view.simClock).toBe(10);
    expect(turn.sequence).toBe(2);
    expect(turn.completed).toBe(true);
  });

  it("coaches a failed task attempt without evidence, then logs completion", async () => {
    const { caller, repository } = setup();
    const created = await caller.session.create({
      seed: 42,
      sessionKind: "assessed",
      pacingMode: "standard",
    });

    const weak = await caller.simulation.submitTaskAttempt({
      sessionId: created.sessionId,
      taskId: "login-alert-compare",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["one-normal-login"],
    });
    expect(weak).toMatchObject({
      accepted: false,
      completed: false,
      sequence: 1,
    });
    expect(weak.feedback).toMatch(/order of events/i);
    expect(repository.evidenceFor("user-1", created.sessionId)).toHaveLength(0);

    await caller.simulation.submitTaskAttempt({
      sessionId: created.sessionId,
      taskId: "login-alert-compare",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["failures-then-success"],
    });
    const completed = await caller.simulation.submitTaskAttempt({
      sessionId: created.sessionId,
      taskId: "login-alert-compare",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["geo-hint"],
    });
    expect(completed.completed).toBe(true);
    expect(repository.evidenceFor("user-1", created.sessionId)).toHaveLength(1);

    await expect(
      caller.simulation.submitTaskAttempt({
        sessionId: created.sessionId,
        taskId: "login-alert-compare",
        eventId: "suspicious-login-1",
        selectedOptionIds: ["geo-hint"],
      }),
    ).rejects.toThrow("not available");
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

    for (const sessionId of [assessed.sessionId, tutorial.sessionId]) {
      await caller.simulation.submitTaskAttempt({
        sessionId,
        taskId: "login-alert-compare",
        eventId: "suspicious-login-1",
        selectedOptionIds: ["failures-then-success"],
      });
      await caller.simulation.submitTaskAttempt({
        sessionId,
        taskId: "login-alert-compare",
        eventId: "suspicious-login-1",
        selectedOptionIds: ["geo-hint"],
      });
    }

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

    await caller.simulation.performWorkplaceInteraction({
      sessionId: created.sessionId,
      interaction: { type: "open_artifact", artifactId: "handoff-email" },
    });
    await caller.simulation.submitTaskAttempt({
      sessionId: created.sessionId,
      taskId: "handoff-open-items",
      eventId: "handoff-1",
      selectedOptionIds: ["device-check"],
    });
    await caller.simulation.submitTaskAttempt({
      sessionId: created.sessionId,
      taskId: "handoff-open-items",
      eventId: "handoff-1",
      selectedOptionIds: ["scanner-window"],
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

  it("persists a notification response without time or evidence", async () => {
    const { caller, repository } = setup();
    const created = await caller.session.create({
      seed: 42,
      sessionKind: "assessed",
      pacingMode: "standard",
    });
    const attempts = [
      ["login-alert-compare", "suspicious-login-1", ["failures-then-success"]],
      ["login-alert-compare", "suspicious-login-1", ["geo-hint"]],
      ["handoff-open-items", "handoff-1", ["device-check"]],
      ["handoff-open-items", "handoff-1", ["scanner-window"]],
      ["handoff-priority-message", "handoff-1", ["login-first-watch-routine"]],
      [
        "login-context-clues",
        "suspicious-login-1",
        ["unknown-windows-device", "new-residential-network"],
      ],
    ] as const;
    for (const [taskId, eventId, selectedOptionIds] of attempts) {
      if (taskId === "handoff-open-items")
        await caller.simulation.performWorkplaceInteraction({
          sessionId: created.sessionId,
          interaction: { type: "open_artifact", artifactId: "handoff-email" },
        });
      await caller.simulation.submitTaskAttempt({
        sessionId: created.sessionId,
        taskId,
        eventId,
        selectedOptionIds: [...selectedOptionIds],
      });
    }
    const before = await caller.session.get({ sessionId: created.sessionId });
    expect(before.view.notifications[0]?.id).toBe("routine-scanner-arrived");
    const evidenceCount = repository.evidenceFor(
      "user-1",
      created.sessionId,
    ).length;

    const response = await caller.simulation.respondToNotification({
      sessionId: created.sessionId,
      notificationId: "routine-scanner-arrived",
      response: "continue",
    });

    expect(response.view.simClock).toBe(before.view.simClock);
    expect(response.view.notifications[0]?.status).toBe("acknowledged");
    expect(repository.evidenceFor("user-1", created.sessionId)).toHaveLength(
      evidenceCount,
    );
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
    await caller.simulation.submitTaskAttempt({
      sessionId: created.sessionId,
      taskId: "login-alert-compare",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["failures-then-success"],
    });
    await caller.simulation.submitTaskAttempt({
      sessionId: created.sessionId,
      taskId: "login-alert-compare",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["geo-hint"],
    });

    const exported = await caller.privacy.exportData();
    expect(exported.sessions).toHaveLength(1);
    expect(exported.actionLog).toHaveLength(2);

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
