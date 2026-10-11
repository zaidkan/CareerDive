import type { FastifyPluginAsync } from "fastify";
export const healthRoutes: FastifyPluginAsync<{
  checkReady: () => Promise<void>;
}> = async (server, { checkReady }) => {
  // Startup bursts and Render probes share one check per process. Cache failures
  // too, so a dependency outage cannot amplify into a probe storm.
  let pending: Promise<boolean> | undefined;
  let cached: { ready: boolean; until: number } | undefined;
  const ready = async (): Promise<boolean> => {
    if (cached && Date.now() < cached.until) return cached.ready;
    pending ??= Promise.resolve()
      .then(checkReady)
      .then(
        () => true,
        () => false,
      )
      .then((result) => {
        cached = { ready: result, until: Date.now() + 1000 };
        return result;
      })
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
  server.get("/health", async () => ({ status: "alive" }));
  server.get("/ready", async (_request, reply) => {
    if (await ready()) return { status: "ready" };
    return reply.code(503).send({ status: "unavailable" });
  });
};
