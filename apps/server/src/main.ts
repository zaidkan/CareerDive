import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import { AnthropicLlmProvider } from "@sim/ai";
import { createClient } from "@supabase/supabase-js";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import {
  fastifyTRPCPlugin,
  type CreateFastifyContextOptions,
} from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { InMemoryRepository, createAppRouter, type AppContext } from "./index.js";
import { createPostgresRepository } from "./db/repository.js";
import {
  allowedWebOrigins,
  describeListenFailure,
} from "./config.js";

const port = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === "production";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (isProduction && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required in production");
}
if (isProduction && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in production for durable assessed shifts");
}

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : undefined;

const server = Fastify({
  logger: {
    redact: [
      "req.headers.authorization",
      "*.freeText",
      "*.reflection",
      "*.dialogue",
    ],
  },
  bodyLimit: 64 * 1024,
});
await server.register(cors, {
  origin: allowedWebOrigins(isProduction, process.env.WEB_ORIGIN),
});
await server.register(rateLimit, {
  max: 120,
  timeWindow: "1 minute",
});

server.get("/health", async () => ({ status: "ok" }));

const repository = process.env.DATABASE_URL
  ? createPostgresRepository(process.env.DATABASE_URL)
  : new InMemoryRepository();
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const llmProvider = anthropicApiKey
  ? new AnthropicLlmProvider(
      {
        messages: {
          create: async (request: unknown) => {
            const client = new Anthropic({ apiKey: anthropicApiKey });
            const response = await client.messages.create(
              request as MessageCreateParamsNonStreaming,
            );
            return {
              content: response.content.map((block) =>
                block.type === "tool_use"
                  ? {
                      type: "tool_use" as const,
                      name: block.name,
                      input: block.input,
                    }
                  : { type: block.type },
              ),
              usage: {
                input_tokens: response.usage.input_tokens,
                output_tokens: response.usage.output_tokens,
              },
            };
          },
        },
      },
      {
        inputUsdPerMillion: 3,
        outputUsdPerMillion: 15,
      },
    )
  : undefined;
const appRouter = createAppRouter(repository, {
  ...(llmProvider ? { llmProvider } : {}),
  aiBudgetUsd: Number(process.env.AI_SESSION_BUDGET_USD ?? 0.05),
});

await server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext: async ({
      req,
    }: CreateFastifyContextOptions): Promise<AppContext> => {
      const authorization = req.headers.authorization;
      if (supabase && authorization?.startsWith("Bearer ")) {
        const token = authorization.slice("Bearer ".length);
        const { data, error } = await supabase.auth.getUser(token);
        if (error) {
          return { userId: "" };
        }
        return { userId: data.user.id };
      }
      if (!isProduction) {
        const header = req.headers["x-user-id"];
        return { userId: typeof header === "string" ? header : "local-user" };
      }
      return { userId: "" };
    },
  },
});

try {
  await server.listen({ host: "0.0.0.0", port });
} catch (error) {
  server.log.error(describeListenFailure(port, error));
  process.exit(1);
}
