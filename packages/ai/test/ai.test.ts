import { describe, expect, it } from "vitest";
import {
  AnthropicLlmProvider,
  FakeLlmProvider,
  MODEL_ROLES,
  buildNpcContext,
} from "../src/index.js";
import { createInitialWorldState } from "@sim/core";

describe("bounded AI context", () => {
  it("removes facts the speaking NPC may not know", () => {
    const state = createInitialWorldState("session-1", 42);
    const context = buildNpcContext(state, "manager");

    expect(context.facts.map(({ id }) => id)).toContain("alert-visible");
    expect(context.facts.map(({ id }) => id)).not.toContain(
      "employee-private-travel",
    );
    expect(JSON.stringify(context)).not.toContain("Montreal");
  });

  it("centralizes model roles", () => {
    expect(MODEL_ROLES).toEqual({
      classifier: "claude-haiku-4-5",
      primary: "claude-sonnet-4-6",
      deepValidation: "claude-opus-4-8",
    });
  });

  it("uses schema-valid canned output in tests", async () => {
    const provider = new FakeLlmProvider({
      dialogue: "Please document what you found before escalating.",
      tone: "neutral",
      referencedFactIds: ["alert-visible"],
      proposedMinorStateUpdates: [],
    });

    const result = await provider.generate({
      role: "primary",
      system: "test",
      messages: [{ role: "user", content: "What should I do?" }],
      maxTokens: 200,
    });

    expect(result.value.dialogue).toContain("document");
    expect(result.usage.totalCostUsd).toBe(0);
  });

  it("forces the structured output tool in the Anthropic adapter", async () => {
    const requests: unknown[] = [];
    const provider = new AnthropicLlmProvider(
      {
        messages: {
          create: (request: unknown) => {
            requests.push(request);
            return Promise.resolve({
              content: [
                {
                  type: "tool_use",
                  name: "emit_npc_turn",
                  input: {
                    dialogue: "Document the alert.",
                    tone: "neutral",
                    referencedFactIds: ["alert-visible"],
                    proposedMinorStateUpdates: [],
                  },
                },
              ],
              usage: { input_tokens: 100, output_tokens: 20 },
            });
          },
        },
      },
      {
        inputUsdPerMillion: 3,
        outputUsdPerMillion: 15,
      },
    );

    const result = await provider.generate({
      role: "primary",
      system: "Stay bounded.",
      messages: [{ role: "user", content: "What next?" }],
      maxTokens: 200,
    });

    expect(requests[0]).toEqual(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        tool_choice: { type: "tool", name: "emit_npc_turn" },
      }),
    );
    expect(result.value.dialogue).toBe("Document the alert.");
    expect(result.usage.totalCostUsd).toBeCloseTo(0.0006);
  });
});
