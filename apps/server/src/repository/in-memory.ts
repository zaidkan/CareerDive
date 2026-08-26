import { randomUUID } from "node:crypto";
import type { EvidenceSignal, WorldState } from "@sim/schemas";
import { GrantNotFoundError, SessionNotFoundError } from "../domain/errors.js";
import type { SharingGrant, StoredSession } from "../domain/session.js";
import type { SimulationRepository } from "./types.js";

export function toPublicGrant(grant: SharingGrant) {
  return {
    id: grant.id,
    recipientId: grant.recipientId,
    categories: grant.categories,
    expiresAt: grant.expiresAt,
  };
}

export class InMemoryRepository implements SimulationRepository {
  readonly #sessions = new Map<string, StoredSession>();
  readonly #grants = new Map<string, SharingGrant>();

  async createSession(ownerId: string, state: WorldState): Promise<void> {
    this.#sessions.set(state.sessionId, {
      ownerId,
      state,
      actionLog: [],
      evidence: [],
      reflections: [],
    });
  }

  async getSession(ownerId: string, sessionId: string): Promise<StoredSession> {
    const session = this.#sessions.get(sessionId);
    if (!session || session.ownerId !== ownerId) {
      throw new SessionNotFoundError();
    }
    return session;
  }

  async saveSession(session: StoredSession): Promise<void> {
    this.#sessions.set(session.state.sessionId, session);
  }

  async deleteSession(ownerId: string, sessionId: string): Promise<void> {
    await this.getSession(ownerId, sessionId);
    this.#sessions.delete(sessionId);
  }

  async deleteAccount(ownerId: string): Promise<void> {
    for (const [sessionId, session] of this.#sessions) {
      if (session.ownerId === ownerId) {
        this.#sessions.delete(sessionId);
      }
    }
    for (const [grantId, grant] of this.#grants) {
      if (grant.ownerId === ownerId) {
        this.#grants.delete(grantId);
      }
    }
  }

  async listSessions(ownerId: string): Promise<StoredSession[]> {
    return [...this.#sessions.values()].filter(
      (session) => session.ownerId === ownerId,
    );
  }

  async createGrant(
    ownerId: string,
    input: Omit<SharingGrant, "id" | "ownerId">,
  ): Promise<SharingGrant> {
    const grant: SharingGrant = {
      id: randomUUID(),
      ownerId,
      ...input,
    };
    this.#grants.set(grant.id, grant);
    return grant;
  }

  async listGrants(ownerId: string): Promise<SharingGrant[]> {
    return [...this.#grants.values()].filter(
      (grant) => grant.ownerId === ownerId && grant.revokedAt === undefined,
    );
  }

  async revokeGrant(ownerId: string, grantId: string): Promise<void> {
    const grant = this.#grants.get(grantId);
    if (!grant || grant.ownerId !== ownerId) {
      throw new GrantNotFoundError();
    }
    grant.revokedAt = new Date().toISOString();
  }

  // Test-only inspection hook: deliberately not part of `SimulationRepository`.
  evidenceFor(ownerId: string, sessionId: string): EvidenceSignal[] {
    const session = this.#sessions.get(sessionId);
    return session?.ownerId === ownerId ? session.evidence : [];
  }
}
