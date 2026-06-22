import {
  NpcTurnOutputSchema,
  type NpcTurnOutput,
  type SafetyResult,
} from "@sim/schemas";

const PROHIBITED_PATTERNS: RegExp[] = [
  /\b\d+(?:\.\d+)?\s*%/,
  /\byou should become\b/i,
  /\byou are (?:an?|the)\b/i,
  /\bcompatibility score\b/i,
  /\brank(?:ing|ed)?\b/i,
];

export class BudgetExceededError extends Error {
  constructor() {
    super("Session AI budget exceeded");
    this.name = "BudgetExceededError";
  }
}

export class SessionBudget {
  readonly ceilingUsd: number;
  #spentUsd = 0;

  constructor(ceilingUsd: number) {
    if (ceilingUsd <= 0) {
      throw new Error("Budget ceiling must be positive");
    }
    this.ceilingUsd = ceilingUsd;
  }

  get spentUsd(): number {
    return this.#spentUsd;
  }

  get remainingUsd(): number {
    return this.ceilingUsd - this.#spentUsd;
  }

  record(costUsd: number): void {
    if (costUsd < 0) {
      throw new Error("Cost cannot be negative");
    }
    if (this.#spentUsd + costUsd > this.ceilingUsd) {
      throw new BudgetExceededError();
    }
    this.#spentUsd += costUsd;
  }
}

export function validateUserFacingText(text: string): string {
  const violation = PROHIBITED_PATTERNS.find((pattern) => pattern.test(text));
  if (violation) {
    throw new Error("User-facing text violates exploration guardrails");
  }
  return text;
}

export function validateNpcOutput(
  rawOutput: unknown,
  permittedFactIds: Set<string>,
): NpcTurnOutput {
  const output = NpcTurnOutputSchema.parse(rawOutput);
  if (
    output.referencedFactIds.some(
      (factId) => !permittedFactIds.has(factId),
    )
  ) {
    throw new Error("NPC referenced a restricted fact");
  }
  validateUserFacingText(output.dialogue);
  return output;
}

export function deterministicInputSafety(input: string): SafetyResult {
  const normalized = input.trim();
  if (!normalized) {
    return {
      allowed: false,
      reason: "empty_input",
      fallback: "Choose an available action or ask a workplace question.",
    };
  }
  if (/ignore (?:all|previous) instructions|system prompt/i.test(normalized)) {
    return {
      allowed: false,
      reason: "prompt_injection",
      fallback:
        "I can help with questions and actions inside this workplace simulation.",
    };
  }
  return { allowed: true };
}
