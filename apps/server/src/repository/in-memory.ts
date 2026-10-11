import { randomUUID } from "node:crypto";
import type { EvidenceSignal, Reflection, WorldState } from "@sim/schemas";
import {
  GrantNotFoundError,
  SessionNotFoundError,
  WriteBudgetError,
} from "../domain/errors.js";
import {
  SESSION_CREATIONS_PER_HOUR,
  REFLECTIONS_PER_HOUR,
  REFLECTIONS_PER_SESSION,
  sameReflection,
} from "./write-budgets.js";
import type { SharingGrant, StoredSession } from "../domain/session.js";
import type {
  CohortCount,
  CompletedDecision,
} from "../domain/decision-review.js";
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
  readonly #createRequests = new Map<string, string>();
  readonly #decisions = new Map<string, CompletedDecision>();
  readonly #writeLimits = new Map<
    string,
    { startedAt: number; count: number }
  >();

  #consumeBudget(
    ownerId: string,
    operation: "session" | "reflection",
    limit: number,
  ) {
    const key = `${ownerId}:${operation}`;
    const now = Date.now();
    const previous = this.#writeLimits.get(key);
    const window =
      previous && previous.startedAt > now - 3_600_000
        ? previous
        : { startedAt: now, count: 0 };
    if (window.count >= limit) throw new WriteBudgetError();
    window.count += 1;
    this.#writeLimits.set(key, window);
  }

  async createSession(
    ownerId: string,
    state: WorldState,
    createRequestId?: string,
  ): Promise<StoredSession> {
    const key = `${ownerId}:${createRequestId ?? state.sessionId}`;
    const existing = this.#createRequests.get(key);
    if (existing && this.#sessions.has(existing))
      return this.getSession(ownerId, existing);
    this.#consumeBudget(ownerId, "session", SESSION_CREATIONS_PER_HOUR);
    this.#createRequests.set(key, state.sessionId);
    this.#sessions.set(state.sessionId, {
      ownerId,
      state,
      actionLog: [],
      evidence: [],
      reflections: [],
    });
    return this.getSession(ownerId, state.sessionId);
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

  async submitReflection(
    ownerId: string,
    reflection: Reflection,
  ): Promise<Reflection> {
    const session = await this.getSession(ownerId, reflection.sessionId);
    const existing = session.reflections.find((row) =>
      sameReflection(row, reflection),
    );
    if (existing) return existing;
    if (session.reflections.length >= REFLECTIONS_PER_SESSION)
      throw new WriteBudgetError();
    this.#consumeBudget(ownerId, "reflection", REFLECTIONS_PER_HOUR);
    session.reflections.push(reflection);
    return reflection;
  }

  async saveCompletedDecisions(decisions: CompletedDecision[]): Promise<void> {
    for (const decision of decisions) {
      const key = `${decision.sessionId}:${decision.decisionId}`;
      if (!this.#decisions.has(key)) this.#decisions.set(key, decision);
    }
  }

  async getRecordedDecisionIds(
    sessionId: string,
    careerId: string,
    careerVersion: string,
  ): Promise<string[]> {
    return [...this.#decisions.values()]
      .filter(
        (decision) =>
          decision.sessionId === sessionId &&
          decision.careerId === careerId &&
          decision.careerVersion === careerVersion,
      )
      .map((decision) => decision.decisionId);
  }

  async getCohortCounts(
    careerId: string,
    careerVersion: string,
  ): Promise<CohortCount[]> {
    const counts = new Map<string, CohortCount>();
    for (const decision of this.#decisions.values()) {
      const session = this.#sessions.get(decision.sessionId);
      const sessionKind: string | undefined = session?.state.sessionKind;
      if (
        decision.careerId !== careerId ||
        decision.careerVersion !== careerVersion ||
        sessionKind !== "assessed" ||
        !session?.state.completedActionIds.includes("complete_shift")
      )
        continue;
      const key = `${decision.decisionId}:${decision.choiceId}:${decision.optionSetKey ?? ""}`;
      const row = counts.get(key) ?? {
        decisionId: decision.decisionId,
        choiceId: decision.choiceId,
        optionSetKey: decision.optionSetKey ?? "",
        count: 0,
      };
      row.count += 1;
      counts.set(key, row);
    }
    return [...counts.values()];
  }

  async deleteSession(ownerId: string, sessionId: string): Promise<void> {
    await this.getSession(ownerId, sessionId);
    this.#sessions.delete(sessionId);
    for (const [key, decision] of this.#decisions)
      if (decision.sessionId === sessionId) this.#decisions.delete(key);
  }

  async deleteAccount(ownerId: string): Promise<void> {
    this.#writeLimits.delete(`${ownerId}:session`);
    this.#writeLimits.delete(`${ownerId}:reflection`);
    for (const [sessionId, session] of this.#sessions) {
      if (session.ownerId === ownerId) {
        this.#sessions.delete(sessionId);
        for (const [key, decision] of this.#decisions)
          if (decision.sessionId === sessionId) this.#decisions.delete(key);
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
