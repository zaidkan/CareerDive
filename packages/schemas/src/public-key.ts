import { z } from "zod";

/** Only public credentials may be used by web bundles and auth verification. */
export const SupabasePublicKeySchema = z.string().refine((key) => {
  if (key.startsWith("sb_publishable_"))
    return key.length > "sb_publishable_".length;
  try {
    const payload: unknown = JSON.parse(
      atob((key.split(".")[1] ?? "").replaceAll("-", "+").replaceAll("_", "/")),
    );
    return (
      typeof payload === "object" &&
      payload !== null &&
      "role" in payload &&
      payload.role === "anon"
    );
  } catch {
    return false;
  }
}, "Use a public Supabase publishable or legacy anon key");
