import postgres from "postgres";
import {
  ActionLogEntrySchema,
  EvidenceSignalSchema,
  ReflectionSchema,
  WorldStateSchema,
} from "@sim/schemas";
import {
  GrantNotFoundError,
  SessionNotFoundError,
  SessionConflictError,
} from "../domain/errors.js";
import type { SharingGrant, StoredSession } from "../domain/session.js";
import type {
  CohortCount,
  CompletedDecision,
} from "../domain/decision-review.js";
import type { SimulationRepository } from "../repository/types.js";

type SqlClient = ReturnType<typeof postgres>;

type SessionRow = {
  revision: number;
  owner_id: string;
  current_state: unknown;
};

export class PostgresRepository implements SimulationRepository {
  readonly #sql: SqlClient;

  constructor(sql: SqlClient) {
    this.#sql = sql;
  }

  async createSession(
    ownerId: string,
    state: StoredSession["state"],
    createRequestId?: string,
  ): Promise<StoredSession> {
    await this.#sql`
      INSERT INTO simulation_sessions (
        id, owner_id, career_id, session_kind, pacing_mode, seed, current_state, create_request_id
      ) VALUES (
        ${state.sessionId}::uuid,
        ${ownerId}::uuid,
        'cybersecurity_analyst',
        ${state.sessionKind},
        ${state.pacingMode},
        ${state.seed},
        ${this.#sql.json(state)},
        ${createRequestId ?? state.sessionId}::uuid
      )
      ON CONFLICT (owner_id, create_request_id) DO NOTHING
    `;
    const rows = await this.#sql<{ id: string }[]>`
      SELECT id FROM simulation_sessions WHERE owner_id = ${ownerId}::uuid
        AND create_request_id = ${createRequestId ?? state.sessionId}::uuid
    `;
    if (!rows[0]) throw new SessionNotFoundError();
    return this.getSession(ownerId, rows[0].id);
  }

  async getSession(ownerId: string, sessionId: string): Promise<StoredSession> {
    return this.#sql.begin(
      "isolation level repeatable read read only",
      async (transaction) => {
        const rows = await transaction<SessionRow[]>`
      SELECT owner_id, current_state, revision
      FROM simulation_sessions
      WHERE id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid
      LIMIT 1
    `;
        const row = rows[0];
        if (!row) {
          throw new SessionNotFoundError();
        }
        const [actionRows, evidenceRows, reflectionRows] = await Promise.all([
          transaction<{ sequence: number; action: unknown }[]>`
        SELECT sequence, action FROM action_log
        WHERE session_id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid
        ORDER BY sequence
      `,
          transaction<{ payload: unknown }[]>`
        SELECT jsonb_strip_nulls(jsonb_build_object(
          'id', id,
          'sessionId', session_id,
          'actionId', provenance->>'actionId',
          'eventId', provenance->>'eventId',
          'rhythm', provenance->>'rhythm',
          'pacingMode', provenance->>'pacingMode',
          'category', category,
          'dimension', dimension,
          'observation', observation,
          'occurredAt', provenance->>'occurredAt',
          'annotation', user_annotation
        )) AS payload
        FROM evidence_signals
        WHERE session_id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid
      `,
          transaction<{ payload: unknown }[]>`
        SELECT jsonb_strip_nulls(jsonb_build_object(
          'id', id,
          'sessionId', session_id,
          'eventId', event_id,
          'enjoyment', enjoyment,
          'confidence', confidence,
          'note', note,
          'createdAt', created_at
        )) AS payload
        FROM reflections
        WHERE session_id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid
      `,
        ]);
        return {
          revision: row.revision,
          ownerId: row.owner_id,
          state: WorldStateSchema.parse(row.current_state),
          actionLog: actionRows.map((entry) =>
            ActionLogEntrySchema.parse({
              sequence: entry.sequence,
              interaction: entry.action,
            }),
          ),
          evidence: evidenceRows.map(({ payload }) =>
            EvidenceSignalSchema.parse(payload),
          ),
          reflections: reflectionRows.map(({ payload }) =>
            ReflectionSchema.parse(payload),
          ),
        };
      },
    );
  }

  async saveSession(session: StoredSession): Promise<void> {
    await this.#sql.begin(async (transaction) => {
      const updated = await transaction`
        UPDATE simulation_sessions
        SET revision = revision + 1, current_state = ${transaction.json(session.state)},
            completed_at = CASE WHEN ${session.state.completedActionIds.includes("complete_shift")}
              THEN COALESCE(completed_at, now()) ELSE completed_at END
        WHERE id = ${session.state.sessionId}::uuid
          AND owner_id = ${session.ownerId}::uuid
          AND revision = ${session.revision ?? 0}
        RETURNING id
      `;
      if (updated.length === 0) throw new SessionConflictError();
      await transaction`
        DELETE FROM action_log
        WHERE session_id = ${session.state.sessionId}::uuid
          AND owner_id = ${session.ownerId}::uuid
      `;
      for (const entry of session.actionLog) {
        await transaction`
          INSERT INTO action_log (
            session_id, owner_id, sequence, action, accepted_delta
          ) VALUES (
            ${session.state.sessionId}::uuid,
            ${session.ownerId}::uuid,
            ${entry.sequence},
            ${transaction.json(entry.interaction)},
            '{}'::jsonb
          )
        `;
      }
      await transaction`
        DELETE FROM evidence_signals
        WHERE session_id = ${session.state.sessionId}::uuid
          AND owner_id = ${session.ownerId}::uuid
      `;
      for (const signal of session.evidence) {
        await transaction`
          INSERT INTO evidence_signals (
            id, session_id, owner_id, category, dimension,
            observation, provenance, user_annotation
          ) VALUES (
            ${signal.id}::uuid,
            ${session.state.sessionId}::uuid,
            ${session.ownerId}::uuid,
            ${signal.category},
            ${signal.dimension},
            ${signal.observation},
            ${transaction.json({
              actionId: signal.actionId,
              eventId: signal.eventId,
              rhythm: signal.rhythm,
              pacingMode: signal.pacingMode,
              occurredAt: signal.occurredAt,
            })},
            ${signal.annotation ?? null}
          )
        `;
      }
      await transaction`
        DELETE FROM reflections
        WHERE session_id = ${session.state.sessionId}::uuid
          AND owner_id = ${session.ownerId}::uuid
      `;
      for (const reflection of session.reflections) {
        await transaction`
          INSERT INTO reflections (
            id, session_id, owner_id, event_id, enjoyment,
            confidence, note, created_at
          ) VALUES (
            ${reflection.id}::uuid,
            ${session.state.sessionId}::uuid,
            ${session.ownerId}::uuid,
            ${reflection.eventId},
            ${reflection.enjoyment},
            ${reflection.confidence},
            ${reflection.note ?? null},
            ${reflection.createdAt}::timestamptz
          )
        `;
      }
    });
    session.revision = (session.revision ?? 0) + 1;
  }

  async saveCompletedDecisions(decisions: CompletedDecision[]): Promise<void> {
    if (decisions.length === 0) return;
    await this.#sql.begin(async (transaction) => {
      for (const decision of decisions) {
        await transaction`
          INSERT INTO decision_reviews (session_id, career_id, career_version, decision_id, choice_id, option_set_key)
          VALUES (${decision.sessionId}::uuid, ${decision.careerId}, ${decision.careerVersion}, ${decision.decisionId}, ${decision.choiceId}, ${decision.optionSetKey ?? ""})
          ON CONFLICT (session_id, decision_id) DO NOTHING
        `;
      }
    });
  }

  async getRecordedDecisionIds(
    sessionId: string,
    careerId: string,
    careerVersion: string,
  ): Promise<string[]> {
    const rows = await this.#sql<{ decision_id: string }[]>`
      SELECT decision_id FROM decision_reviews
      WHERE session_id = ${sessionId}::uuid
        AND career_id = ${careerId} AND career_version = ${careerVersion}
    `;
    return rows.map(({ decision_id }) => decision_id);
  }

  async getCohortCounts(
    careerId: string,
    careerVersion: string,
  ): Promise<CohortCount[]> {
    const rows = await this.#sql<
      {
        decision_id: string;
        choice_id: string;
        option_set_key: string;
        count: string;
      }[]
    >`
      SELECT d.decision_id, d.choice_id, d.option_set_key, count(*)::text AS count
      FROM decision_reviews d
      JOIN simulation_sessions s ON s.id = d.session_id
      WHERE d.career_id = ${careerId} AND d.career_version = ${careerVersion}
        AND s.completed_at IS NOT NULL AND s.session_kind = 'assessed'
      GROUP BY d.decision_id, d.choice_id, d.option_set_key
    `;
    return rows.map((row) => ({
      decisionId: row.decision_id,
      choiceId: row.choice_id,
      optionSetKey: row.option_set_key,
      count: Number(row.count),
    }));
  }

  async deleteSession(ownerId: string, sessionId: string): Promise<void> {
    const result = await this.#sql`
      DELETE FROM simulation_sessions
      WHERE id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid
      RETURNING id
    `;
    if (result.length === 0) {
      throw new SessionNotFoundError();
    }
  }

  async deleteAccount(ownerId: string): Promise<void> {
    await this.#sql.begin(async (transaction) => {
      await transaction`DELETE FROM sharing_grants WHERE owner_id = ${ownerId}::uuid`;
      await transaction`DELETE FROM simulation_sessions WHERE owner_id = ${ownerId}::uuid`;
      await transaction`DELETE FROM profiles WHERE user_id = ${ownerId}::uuid`;
      await transaction`DELETE FROM career_requests WHERE requester_key = ${ownerId}::uuid`;
      await transaction`DELETE FROM support_reports WHERE owner_id = ${ownerId}::uuid`;
      await transaction`DELETE FROM launch_event_limits WHERE owner_id = ${ownerId}::uuid`;
    });
  }

  async listSessions(ownerId: string): Promise<StoredSession[]> {
    const rows = await this.#sql<{ id: string }[]>`
      SELECT id FROM simulation_sessions
      WHERE owner_id = ${ownerId}::uuid
      ORDER BY created_at
    `;
    return Promise.all(rows.map(({ id }) => this.getSession(ownerId, id)));
  }

  async createGrant(
    ownerId: string,
    input: Omit<SharingGrant, "id" | "ownerId">,
  ): Promise<SharingGrant> {
    const rows = await this.#sql<{ id: string }[]>`
      INSERT INTO sharing_grants (
        owner_id, recipient_id, categories, expires_at
      ) VALUES (
        ${ownerId}::uuid,
        ${input.recipientId}::uuid,
        ${input.categories},
        ${input.expiresAt}::timestamptz
      )
      RETURNING id
    `;
    const row = rows[0];
    if (!row) throw new Error("Sharing grant insert failed");
    return { id: row.id, ownerId, ...input };
  }

  async listGrants(ownerId: string): Promise<SharingGrant[]> {
    return this.#sql<SharingGrant[]>`
      SELECT
        id,
        owner_id AS "ownerId",
        recipient_id AS "recipientId",
        categories,
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt"
      FROM sharing_grants
      WHERE owner_id = ${ownerId}::uuid
        AND revoked_at IS NULL
        AND expires_at > now()
    `;
  }

  async revokeGrant(ownerId: string, grantId: string): Promise<void> {
    const rows = await this.#sql`
      UPDATE sharing_grants SET revoked_at = now()
      WHERE id = ${grantId}::uuid AND owner_id = ${ownerId}::uuid
      RETURNING id
    `;
    if (rows.length === 0) {
      throw new GrantNotFoundError();
    }
  }
}

export function createPostgresRepository(databaseUrl: string) {
  return new PostgresRepository(
    postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    }),
  );
}
