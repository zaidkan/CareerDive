import { expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { CareerPackSchema, WorldStateSchema } from "@sim/schemas";
import { createInitialWorldState } from "../src/index.js";

it("loads old session rules without retrofitting V2 consequence fields", () => {
  const pack = loadDefaultCybersecurityPack();
  const state = createInitialWorldState("legacy-session", 7, {}, pack);
  state.careerVersion = "1.0.0";
  const legacyEffect = state.rules.actions.document_ticket?.defaultEffect?.consequence;
  if (!legacyEffect) throw new Error("Missing consequence fixture");
  delete legacyEffect.escalateOnApply;
  expect(WorldStateSchema.parse(state).rules.actions.document_ticket?.defaultEffect?.consequence?.escalateOnApply).toBeUndefined();

  const invalidPack = structuredClone(pack);
  const effect = invalidPack.scenario.actions.find(({ id }) => id === "document_ticket")?.defaultEffect?.consequence;
  if (!effect) throw new Error("Missing authored consequence fixture");
  delete effect.escalateOnApply;
  expect(CareerPackSchema.safeParse(invalidPack).success).toBe(false);
});
