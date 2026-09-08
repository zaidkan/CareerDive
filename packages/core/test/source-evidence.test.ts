import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { describe, expect, it } from "vitest";
import { CareerPackSchema } from "@sim/schemas";
import {
  createInitialWorldState,
  toClientView,
  applyTaskAttempt,
  applyWorkplaceInteraction,
} from "../src/index.js";

describe("source-bound evidence", () => {
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
    const state = createInitialWorldState(
      "source-test",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );
    const task = () =>
      toClientView(state).tasks.find(({ id }) => id === "handoff-open-items");
    expect(task()?.options[0]).toHaveProperty(
      "source.artifactId",
      "handoff-email",
    );
    expect(task()?.options[0]).not.toHaveProperty("source.quote");
    const opened = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "handoff-email",
    }).state;
    expect(
      toClientView(opened).tasks.find(({ id }) => id === "handoff-open-items")
        ?.options[0],
    ).toHaveProperty("source.quote", "Did not finish device inventory check.");
  });

  it("requires inspection before accepting a source-based answer", () => {
    const state = createInitialWorldState(
      "source-test",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );
    const attempt = {
      taskId: "handoff-open-items",
      eventId: "handoff-1",
      selectedOptionIds: ["device-check"],
    };
    expect(() => applyTaskAttempt(state, attempt)).toThrow(
      "Open the source records",
    );
    expect(state.simClock).toBe(0);
    const opened = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "handoff-email",
    }).state;
    expect(applyTaskAttempt(opened, attempt).accepted).toBe(true);
  });
});
