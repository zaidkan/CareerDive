import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { describe, expect, it } from "vitest";
import { createInitialWorldState, toClientView } from "../src/index.js";

describe("client artifact serialization", () => {
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
