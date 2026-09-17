import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { WorldStateSchema } from "@sim/schemas";
import * as coreIndex from "../src/index.js";
import { createInitialWorldState, foldActionLog } from "../src/index.js";
import type { ActionLogEntry } from "@sim/schemas";

const pack = loadDefaultCybersecurityPack();

describe("P1-T07 rng wire-or-delete", () => {
  it("exposes no seeded-RNG factory on the canonical entrypoint", () => {
    expect("createSeededRandom" in coreIndex).toBe(false);
  });

  it("parses canonical world state with no rngState field", () => {
    const state = createInitialWorldState("rng-delete-probe", 7, {}, pack);
    const { rngState, ...rest } = state as Record<string, unknown>;
    expect(rngState).toBeUndefined();
    const parsed = WorldStateSchema.parse(rest);
    expect(parsed.sessionId).toBe("rng-delete-probe");
  });

  it("replays identical action logs into identical state with no RNG involved", () => {
    const first = createInitialWorldState("rng-replay-a", 42, {}, pack);
    const second = createInitialWorldState("rng-replay-a", 42, {}, pack);
    expect(second).toEqual(first);
    const entries: ActionLogEntry[] = [];
    expect(foldActionLog(second, entries)).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
