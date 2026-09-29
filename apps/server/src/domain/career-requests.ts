import { z } from "zod";

export const REQUESTABLE_CAREER_IDS = [
  "registered-nurse",
  "mechanical-engineer",
  "electrician",
  "lawyer-attorney",
] as const;

export const RequesterKeySchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
);
export const CareerRequestSchema = z.object({
  careerId: z.enum(REQUESTABLE_CAREER_IDS),
  requested: z.boolean(),
}).strict();

export type CareerId = (typeof REQUESTABLE_CAREER_IDS)[number];
