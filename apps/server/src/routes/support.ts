import type { FastifyPluginAsync } from "fastify";
import { SupportReportSchema } from "@sim/schemas";
import type { ResolveOwner } from "../auth.js";
import {
  SupportRateLimitError,
  type SupportStore,
} from "../repository/support.js";
export const supportRoutes: FastifyPluginAsync<{
  store: SupportStore;
  resolveOwner: ResolveOwner;
}> = async (server, { store, resolveOwner }) => {
  server.post(
    "/api/support-reports",
    {
      logLevel: "silent",
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const ownerId = await resolveOwner(request);
      if (!ownerId) return reply.code(401).send({ error: "unauthorized" });
      const body = SupportReportSchema.safeParse(request.body);
      if (!body.success) return reply.code(400).send({ error: "invalid_body" });
      try {
        return { saved: true, reportId: await store.save(ownerId, body.data) };
      } catch (error) {
        return reply
          .code(error instanceof SupportRateLimitError ? 429 : 503)
          .send({
            error:
              error instanceof SupportRateLimitError
                ? "rate_limited"
                : "unavailable",
          });
      }
    },
  );
};
