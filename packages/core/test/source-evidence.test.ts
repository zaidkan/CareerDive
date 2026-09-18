import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { describe, expect, it } from "vitest";
import { CareerPackSchema, type CareerPack } from "@sim/schemas";
import {
  applyAction,
  createInitialWorldState,
  toClientView,
  applyTaskAttempt,
  applyWorkplaceInteraction,
} from "../src/index.js";

function legacySourcePack(): CareerPack {
  const pack = structuredClone(loadDefaultCybersecurityPack());
  for (const id of [
    "login-context-clues",
    "account-pattern-compare",
    "device-owner-match",
  ]) {
    const task = pack.scenario.tasks.find((t) => t.id === id);
    if (task) task.releasesActionGate = false;
  }
  return pack;
}

describe("source-bound evidence", () => {
  it("requires both comparison records and preserves source provenance", () => {
    let state = createInitialWorldState(
      "comparison",
      42,
      {},
      legacySourcePack(),
    );
    // Advance via gated tasks (legacy pack for this mechanics test)
    state = applyAction(state, {
      id: "review_alert",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    // review_alert is now released in default, but in legacySourcePack the next
    // inspection is still gated; we need to ensure review_alert is considered completed
    // via the legacy pack's progression (which still requires review_alert before login-context).
    // In legacySourcePack, review_alert is released, so the above already advanced.
    // Now login-context-clues is gated in this pack, so attempt it.
    state = applyTaskAttempt(state, {
      taskId: "login-context-clues",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["unknown-windows-device", "new-residential-network"],
    }).state;
    const attempt = {
      taskId: "account-pattern-compare",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["hq-wifi", "enrolled-macbook"],
    };
    const before = structuredClone(state);
    expect(() => applyTaskAttempt(state, attempt)).toThrow(
      "Open the source records",
    );
    expect(state).toEqual(before);
    state = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "account-history-1",
    }).state;
    const task = toClientView(state).tasks.find(
      ({ id }) => id === attempt.taskId,
    );
    expect(task?.options.map(({ source }) => source?.artifactId)).toEqual([
      "account-history-1",
      "account-history-1",
      "login-context-1",
      "login-context-1",
    ]);
    expect(applyTaskAttempt(state, attempt).accepted).toBe(true);
  });
  it("rejects invented, unrelated, or mixed source mappings", () => {
    for (const invalid of ["invented", "unrelated", "mixed"]) {
      const pack = structuredClone(loadDefaultCybersecurityPack());
      const step = pack.scenario.tasks[0]?.steps[0];
      const option = step?.options[0];
      if (!step || !option?.source) throw new Error("Missing handoff fixture");
      if (invalid === "invented") option.source.quote = "Invented evidence";
      if (invalid === "unrelated") step.relatedArtifactIds = [];
      if (invalid === "mixed") delete option.source;
      expect(CareerPackSchema.safeParse(pack).success).toBe(false);
    }
  });
  it("does not serialize source quotes until their record is opened", () => {
    let state = createInitialWorldState(
      "source-test",
      42,
      {},
      legacySourcePack(),
    );
    state = applyAction(state, {
      id: "review_alert",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    state = applyTaskAttempt(state, {
      taskId: "login-context-clues",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["unknown-windows-device", "new-residential-network"],
    }).state;
    const taskBefore = () =>
      toClientView(state).tasks.find(({ id }) => id === "account-pattern-compare");
    expect(taskBefore()?.options[0]).toHaveProperty(
      "source.artifactId",
      "account-history-1",
    );
    expect(taskBefore()?.options[0]).not.toHaveProperty("source.quote");
    const opened = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "account-history-1",
    }).state;
    expect(
      toClientView(opened).tasks.find(({ id }) => id === "account-pattern-compare")
        ?.options[0],
    ).toHaveProperty("source.quote", "HQ Wi-Fi");
  });

  it("requires inspection before accepting a source-based answer", () => {
    let state = createInitialWorldState(
      "source-test",
      42,
      {},
      legacySourcePack(),
    );
    state = applyAction(state, {
      id: "review_alert",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    state = applyTaskAttempt(state, {
      taskId: "login-context-clues",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["unknown-windows-device", "new-residential-network"],
    }).state;
    const attempt = {
      taskId: "account-pattern-compare",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["hq-wifi", "enrolled-macbook"],
    };
    const beforeClock = state.simClock;
    expect(() => applyTaskAttempt(state, attempt)).toThrow(
      "Open the source records",
    );
    expect(state.simClock).toBe(beforeClock);
    const opened = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "account-history-1",
    }).state;
    expect(applyTaskAttempt(opened, attempt).accepted).toBe(true);
  });
});
