import type { FastifyPluginAsync } from "fastify";
export const healthRoutes: FastifyPluginAsync<{
  checkReady: () => Promise<void>;
}> = async (server, { checkReady }) => {
  server.get("/health", async () => ({ status: "alive" }));
  server.get("/ready", async (_request, reply) => {
    try {
      await checkReady();
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ status: "unavailable" });
    }
  });
};
