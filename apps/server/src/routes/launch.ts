import type { FastifyPluginAsync } from "fastify";
import { LaunchEventSchema } from "@sim/schemas";
import type { ResolveOwner } from "../auth.js";
import {
  LaunchRateLimitError,
  type LaunchEvent,
} from "../repository/launch.js";
export const launchRoutes: FastifyPluginAsync<{
  save: (event: LaunchEvent, ownerId?: string) => Promise<void>;
  resolveOwner: ResolveOwner;
}> = async (server, { save, resolveOwner }) => {
  server.post(
    "/api/launch-events",
    {
      logLevel: "silent",
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const event = LaunchEventSchema.safeParse(request.body);
      if (!event.success)
        return reply.code(400).send({ error: "invalid_event" });
      const isPublic = ["landing", "career_viewed", "start_initiated"].includes(
        event.data.name,
      );
      const owner = isPublic ? undefined : await resolveOwner(request);
      if (!isPublic && !owner)
        return reply.code(401).send({ error: "unauthorized" });
      try {
        await save(event.data, owner);
        return { saved: true };
      } catch (error) {
        return reply
          .code(error instanceof LaunchRateLimitError ? 429 : 503)
          .send({
            error:
              error instanceof LaunchRateLimitError
                ? "rate_limited"
                : "unavailable",
          });
      }
    },
  );
};
