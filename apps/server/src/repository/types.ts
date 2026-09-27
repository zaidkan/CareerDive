import type { WorldState } from "@sim/schemas";
import type { SharingGrant, StoredSession } from "../domain/session.js";
import type { CohortCount, CompletedDecision } from "../domain/decision-review.js";

export interface SimulationRepository {
  createSession(ownerId: string, state: WorldState): Promise<void>;
  getSession(ownerId: string, sessionId: string): Promise<StoredSession>;
  saveSession(session: StoredSession, completedDecisions?: CompletedDecision[]): Promise<void>;
  getCohortCounts(careerId: string, careerVersion: string): Promise<CohortCount[]>;
  deleteSession(ownerId: string, sessionId: string): Promise<void>;
  deleteAccount(ownerId: string): Promise<void>;
  listSessions(ownerId: string): Promise<StoredSession[]>;
  createGrant(
    ownerId: string,
    input: Omit<SharingGrant, "id" | "ownerId">,
  ): Promise<SharingGrant>;
  listGrants(ownerId: string): Promise<SharingGrant[]>;
  revokeGrant(ownerId: string, grantId: string): Promise<void>;
}
