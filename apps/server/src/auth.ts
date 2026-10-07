import type { FastifyRequest } from "fastify";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
export type ResolveOwner = (request: FastifyRequest) => Promise<string>;
export function createOwnerResolver(
  isProduction: boolean,
  supabase?: Pick<SupabaseClient, "auth">,
): ResolveOwner {
  return async (request) => {
    const authorization = request.headers.authorization;
    if (authorization !== undefined) {
      if (!supabase || !/^Bearer \S+$/.test(authorization)) return "";
      try {
        const result = await supabase.auth.getUser(authorization.slice(7));
        if (result.error) return "";
        const id = result.data.user.id;
        return z.string().uuid().safeParse(id).success ? id : "";
      } catch {
        return "";
      }
    }
    if (isProduction) return "";
    const local = request.headers["x-user-id"];
    return typeof local === "string"
      ? local
      : "00000000-0000-4000-8000-000000000001";
  };
}
