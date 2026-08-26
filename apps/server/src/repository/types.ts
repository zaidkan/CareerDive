import type { WorldState } from "@sim/schemas";
import type { SharingGrant, StoredSession } from "../domain/session.js";

export interface SimulationRepository {
  createSession(ownerId: string, state: WorldState): Promise<void>;
  getSession(ownerId: string, sessionId: string): Promise<StoredSession>;
  saveSession(session: StoredSession): Promise<void>;
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
