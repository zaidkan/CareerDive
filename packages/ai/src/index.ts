import type {
  Fact,
  NpcKnowledgeView,
  NpcTurnOutput,
  TokenUsage,
  WorldState,
} from "@sim/schemas";
import { NpcTurnOutputSchema } from "@sim/schemas";

export const MODEL_ROLES = {
  classifier: "claude-haiku-4-5",
  primary: "claude-sonnet-4-6",
  deepValidation: "claude-opus-4-8",
} as const;

export type ModelRole = keyof typeof MODEL_ROLES;
export type LlmMessage = {
  role: "user" | "assistant";
  content: string;
};

export type LlmGenerateInput = {
  role: ModelRole;
  system: string;
  messages: LlmMessage[];
  maxTokens: number;
};

export interface LlmProvider {
  generate(input: LlmGenerateInput): Promise<{
    value: NpcTurnOutput;
    usage: TokenUsage;
  }>;
}

type AnthropicToolResponse = {
  content: Array<
    | { type: "tool_use"; name: string; input: unknown }
    | { type: string; [key: string]: unknown }
  >;
  usage: { input_tokens: number; output_tokens: number };
};

type AnthropicMessagesClient = {
  messages: {
    create(request: unknown): Promise<AnthropicToolResponse>;
  };
};

export class AnthropicLlmProvider implements LlmProvider {
  readonly #client: AnthropicMessagesClient;
  readonly #pricing: {
    inputUsdPerMillion: number;
    outputUsdPerMillion: number;
  };

  constructor(
    client: AnthropicMessagesClient,
    pricing: {
      inputUsdPerMillion: number;
      outputUsdPerMillion: number;
    },
  ) {
    this.#client = client;
    this.#pricing = pricing;
  }

  async generate(input: LlmGenerateInput): Promise<{
    value: NpcTurnOutput;
    usage: TokenUsage;
  }> {
    const response = await this.#client.messages.create({
      model: MODEL_ROLES[input.role],
      system: input.system,
      messages: input.messages,
      max_tokens: input.maxTokens,
      tools: [
        {
          name: "emit_npc_turn",
          description: "Return bounded NPC dialogue for one simulation turn.",
          input_schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "dialogue",
              "tone",
              "referencedFactIds",
              "proposedMinorStateUpdates",
            ],
            properties: {
              dialogue: { type: "string", minLength: 1, maxLength: 2_000 },
              tone: {
                type: "string",
                enum: [
                  "neutral",
                  "concerned",
                  "impatient",
                  "warm",
                  "curt",
                  "encouraging",
                ],
              },
              referencedFactIds: {
                type: "array",
                items: { type: "string" },
              },
              proposedMinorStateUpdates: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["field", "value"],
                  properties: {
                    field: { const: "npcMood" },
                    value: { type: "string" },
                  },
                },
              },
            },
          },
        },
      ],
      tool_choice: { type: "tool", name: "emit_npc_turn" },
    });
    const toolUse = response.content.find(
      (block) => block.type === "tool_use" && block.name === "emit_npc_turn",
    );
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Anthropic response did not contain emit_npc_turn");
    }
    const value = NpcTurnOutputSchema.parse(toolUse.input);
    const totalCostUsd =
      (response.usage.input_tokens / 1_000_000) *
        this.#pricing.inputUsdPerMillion +
      (response.usage.output_tokens / 1_000_000) *
        this.#pricing.outputUsdPerMillion;
    return {
      value,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalCostUsd,
      },
    };
  }
}

export class FakeLlmProvider implements LlmProvider {
  readonly #output: NpcTurnOutput;

  constructor(output: NpcTurnOutput) {
    this.#output = NpcTurnOutputSchema.parse(output);
  }

  generate(input: LlmGenerateInput): Promise<{
    value: NpcTurnOutput;
    usage: TokenUsage;
  }> {
    void input;
    return Promise.resolve({
      value: structuredClone(this.#output),
      usage: { inputTokens: 0, outputTokens: 0, totalCostUsd: 0 },
    });
  }
}

function speakerMayKnow(fact: Fact, npcId: string): boolean {
  if (fact.notKnownBy.includes(npcId)) {
    return false;
  }
  return fact.visibility === "public" || fact.knownBy.includes(npcId);
}

export function buildNpcContext(
  state: WorldState,
  npcId: string,
): NpcKnowledgeView {
  const npc = state.npcs[npcId];
  if (!npc) {
    throw new Error(`Unknown NPC "${npcId}"`);
  }
  return {
    npc,
    facts: Object.values(state.facts).filter((fact) =>
      speakerMayKnow(fact, npcId),
    ),
    publicSceneMemory: state.ledger
      .filter(({ applied }) => applied)
      .map(({ description }) => description),
  };
}
