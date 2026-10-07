import {
  ClientViewSchema,
  PacingModeSchema,
  SessionKindSchema,
} from "@sim/schemas";
import { z } from "zod";
import { SHARING_CATEGORIES } from "../domain/session.js";

export const SessionInputSchema = z.object({
  createRequestId: z.string().uuid().optional(),
  seed: z.number().int(),
  sessionKind: SessionKindSchema,
  pacingMode: PacingModeSchema,
});

export const SessionResultSchema = z.object({
  sessionId: z.string(),
  view: ClientViewSchema,
});

export const SessionIdSchema = z.object({ sessionId: z.string() });

export const SharingCategorySchema = z.enum(SHARING_CATEGORIES);

export const SharingGrantSchema = z.object({
  id: z.string(),
  recipientId: z.string(),
  categories: z.array(SharingCategorySchema),
  expiresAt: z.string().datetime(),
});
