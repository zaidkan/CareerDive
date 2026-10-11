import type { Reflection, WorldState } from "@sim/schemas";
import type { SharingGrant, StoredSession } from "../domain/session.js";
import type {
  CohortCount,
  CompletedDecision,
} from "../domain/decision-review.js";

export interface SimulationRepository {
  createSession(
    ownerId: string,
    state: WorldState,
    createRequestId?: string,
  ): Promise<StoredSession>;
  getSession(ownerId: string, sessionId: string): Promise<StoredSession>;
  saveSession(session: StoredSession): Promise<void>;
  submitReflection(ownerId: string, reflection: Reflection): Promise<Reflection>;
  saveCompletedDecisions(decisions: CompletedDecision[]): Promise<void>;
  getRecordedDecisionIds(
    sessionId: string,
    careerId: string,
    careerVersion: string,
  ): Promise<string[]>;
  getCohortCounts(
    careerId: string,
    careerVersion: string,
  ): Promise<CohortCount[]>;
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
