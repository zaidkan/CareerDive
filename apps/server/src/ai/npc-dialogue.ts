import { buildNpcContext, type LlmProvider } from "@sim/ai";
import {
  SessionBudget,
  deterministicInputSafety,
  validateNpcOutput,
} from "@sim/safety";
import type { WorldState } from "@sim/schemas";

const DIALOGUE_FALLBACK =
  "Open-ended dialogue is temporarily unavailable. You can continue using the approved workplace actions.";

export async function generateSafeNpcReply(input: {
  provider: LlmProvider;
  state: WorldState;
  npcId: string;
  userText: string;
  budgetUsd: number;
}): Promise<{
  source: "generated" | "fallback";
  dialogue: string;
  costUsd: number;
}> {
  const inputSafety = deterministicInputSafety(input.userText);
  if (!inputSafety.allowed) {
    return {
      source: "fallback",
      dialogue: inputSafety.fallback ?? DIALOGUE_FALLBACK,
      costUsd: 0,
    };
  }
  try {
    const context = buildNpcContext(input.state, input.npcId);
    const budget = new SessionBudget(input.budgetUsd);
    const generated = await input.provider.generate({
      role: "primary",
      system:
        "Write only workplace dialogue. Do not change world state, procedure, consequences, or facts.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            question: input.userText,
            context,
          }),
        },
      ],
      maxTokens: 300,
    });
    budget.record(generated.usage.totalCostUsd);
    const output = validateNpcOutput(
      generated.value,
      new Set(context.facts.map(({ id }) => id)),
    );
    return {
      source: "generated",
      dialogue: output.dialogue,
      costUsd: generated.usage.totalCostUsd,
    };
  } catch {
    return { source: "fallback", dialogue: DIALOGUE_FALLBACK, costUsd: 0 };
  }
}
