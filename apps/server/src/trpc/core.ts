import { initTRPC, TRPCError } from "@trpc/server";
import { WorkplaceInteractionError } from "@sim/core";
import { NotFoundError, SessionConflictError } from "../domain/errors.js";
import type { AppContext } from "../domain/session.js";

export const t = initTRPC.context<AppContext>().create({
  errorFormatter({ shape }) {
    return shape.data.code === "INTERNAL_SERVER_ERROR"
      ? { ...shape, message: "Service unavailable" }
      : shape;
  },
});

/**
 * The one place domain errors become transport errors.
 *
 * tRPC does not rethrow downstream failures out of `next()`; it hands back a
 * result whose `error.cause` is the original throw, so the mapping inspects the
 * result rather than wrapping the call in try/catch.
 */
export const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const result = await next({ ctx });
  if (!result.ok && result.error.cause instanceof SessionConflictError)
    throw new TRPCError({
      code: "CONFLICT",
      message: result.error.cause.message,
    });
  if (!result.ok && result.error.cause instanceof NotFoundError) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: result.error.cause.message,
    });
  }
  if (!result.ok && result.error.cause instanceof WorkplaceInteractionError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: result.error.cause.message,
    });
  }
  return result;
});
