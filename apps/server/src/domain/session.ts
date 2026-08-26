import type {
  ActionLogEntry,
  EvidenceSignal,
  Reflection,
  WorldState,
} from "@sim/schemas";

export type AppContext = {
  userId: string;
};

/**
 * Source of truth for the sharing categories. `trpc/schemas.ts` builds the Zod
 * enum from this tuple so the transport layer cannot drift from the domain.
 */
export const SHARING_CATEGORIES = [
  "debrief",
  "pathways",
  "reflections",
] as const;

export type SharingCategory = (typeof SHARING_CATEGORIES)[number];

export type StoredSession = {
  ownerId: string;
  state: WorldState;
  actionLog: ActionLogEntry[];
  evidence: EvidenceSignal[];
  reflections: Reflection[];
};

export type SharingGrant = {
  id: string;
  ownerId: string;
  recipientId: string;
  categories: SharingCategory[];
  expiresAt: string;
  revokedAt?: string;
};
