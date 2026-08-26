import { z } from "zod";

export const PacingModeSchema = z.enum([
  "standard",
  "extended",
  "pause_compatible",
  "no_hard_timer",
  "practice",
]);
export type PacingMode = z.infer<typeof PacingModeSchema>;

export const SessionKindSchema = z.enum(["tutorial", "assessed"]);
export type SessionKind = z.infer<typeof SessionKindSchema>;

export const WorkSystemIdSchema = z.enum([
  "alert_dashboard",
  "ticket_queue",
  "email",
  "knowledge_base",
  "team_chat",
]);
export type WorkSystemId = z.infer<typeof WorkSystemIdSchema>;
