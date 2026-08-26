import { z } from "zod";

export const SafetyResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  fallback: z.string().optional(),
});
export type SafetyResult = z.infer<typeof SafetyResultSchema>;
