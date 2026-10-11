import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import { SupabasePublicKeySchema } from "@sim/schemas";
import { AnthropicLlmProvider } from "@sim/ai";
import { createOwnerResolver } from "./auth.js";
import { poolerCompatibleOptions } from "./db/connection.js";
import { verifyMigrations } from "./db/migrations.js";
import { healthRoutes } from "./routes/health.js";
import { supportRoutes } from "./routes/support.js";
import { launchRoutes } from "./routes/launch.js";
import { PostgresLaunchStore } from "./repository/launch.js";
import {
  InMemorySupportStore,
  PostgresSupportStore,
} from "./repository/support.js";
import { createClient } from "@supabase/supabase-js";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import {
  fastifyTRPCPlugin,
  type CreateFastifyContextOptions,
} from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import {
  InMemoryRepository,
  createAppRouter,
  type AppContext,
} from "./index.js";
import { PostgresRepository } from "./db/repository.js";
import {
  InMemoryCareerRequestStore,
  PostgresCareerRequestStore,
} from "./repository/career-requests.js";
import { careerRequestRoutes } from "./routes/career-requests.js";
import postgres from "postgres";
import {
  allowedWebOrigins,
  describeListenFailure,
  trustOneProxyHop,
} from "./config.js";

const port = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === "production";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (isProduction && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_ANON_KEY are required in production",
  );
}
if (isProduction && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required in production for durable assessed shifts",
  );
}

if (supabaseAnonKey) SupabasePublicKeySchema.parse(supabaseAnonKey);

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
        },
      })
    : undefined;

const resolveOwner = createOwnerResolver(isProduction, supabase);
const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, {
      ...poolerCompatibleOptions,
      connect_timeout: 5,
      max: 10,
      connection: { statement_timeout: 5000 },
    })
  : undefined;
const server = Fastify({
  trustProxy: isProduction ? trustOneProxyHop : false,
  logger: {
    redact: [
      "req.headers.authorization",
      "req.headers.x-requester-key",
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

await server.register(healthRoutes, {
  checkReady: async () => {
    if (sql) {
      await verifyMigrations(sql);
      await sql`SELECT create_request_id, revision, current_state FROM simulation_sessions LIMIT 0`;
      await sql`SELECT option_set_key FROM decision_reviews LIMIT 0`;
      await sql`SELECT requester_key FROM career_requests LIMIT 0`;
      await sql`SELECT owner_id, diagnostics FROM support_reports LIMIT 0`;
      await sql`SELECT event_name FROM launch_events LIMIT 0`;
      await sql`SELECT owner_id, event_count FROM launch_event_limits LIMIT 0`;
      await sql`SELECT owner_id, operation, write_count FROM session_write_limits LIMIT 0`;
    } else if (isProduction) {
      throw new Error("Database unavailable");
    }
    if (isProduction) {
      if (!supabaseUrl || !supabaseAnonKey)
        throw new Error("Authentication configuration unavailable");
      const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: supabaseAnonKey },
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error("Authentication unavailable");
    }
  },
});

const repository = sql ? new PostgresRepository(sql) : new InMemoryRepository();
const careerRequestStore = sql
  ? new PostgresCareerRequestStore(sql)
  : new InMemoryCareerRequestStore();
await server.register(careerRequestRoutes, {
  store: careerRequestStore,
  resolveOwner,
});
await server.register(supportRoutes, {
  store: sql ? new PostgresSupportStore(sql) : new InMemorySupportStore(),
  resolveOwner,
});
const launchStore = sql ? new PostgresLaunchStore(sql) : undefined;
await server.register(launchRoutes, {
  resolveOwner,
  save: async (event, ownerId) => {
    if (launchStore) await launchStore.save(event, ownerId);
    else if (isProduction) throw new Error("Database unavailable");
  },
});
server.addHook("onClose", async () => {
  await sql?.end({ timeout: 5 });
});
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
  requireCreateRequestId: isProduction,
  aiBudgetUsd: Number(process.env.AI_SESSION_BUDGET_USD ?? 0.05),
});

await server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext: async ({
      req,
    }: CreateFastifyContextOptions): Promise<AppContext> => {
      return { userId: await resolveOwner(req) };
    },
  },
});

try {
  await server.listen({ host: "0.0.0.0", port });
} catch (error) {
  server.log.error(describeListenFailure(port, error));
  process.exit(1);
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    void server.close();
  });
}
