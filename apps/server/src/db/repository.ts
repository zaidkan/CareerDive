import postgres from "postgres";
import {
  ActionLogEntrySchema,
  EvidenceSignalSchema,
  ReflectionSchema,
  WorldStateSchema,
} from "@sim/schemas";
import { GrantNotFoundError, SessionNotFoundError } from "../domain/errors.js";
import type { SharingGrant, StoredSession } from "../domain/session.js";
import type { SimulationRepository } from "../repository/types.js";

type SqlClient = ReturnType<typeof postgres>;

type SessionRow = {
  owner_id: string;
  current_state: unknown;
};

export class PostgresRepository implements SimulationRepository {
  readonly #sql: SqlClient;

  constructor(sql: SqlClient) {
    this.#sql = sql;
  }

  async createSession(ownerId: string, state: StoredSession["state"]) {
    await this.#sql`
      INSERT INTO simulation_sessions (
        id, owner_id, career_id, session_kind, pacing_mode, seed, current_state
      ) VALUES (
        ${state.sessionId}::uuid,
        ${ownerId}::uuid,
        'cybersecurity_analyst',
        ${state.sessionKind},
        ${state.pacingMode},
        ${state.seed},
        ${this.#sql.json(state)}
      )
    `;
  }

  async getSession(ownerId: string, sessionId: string): Promise<StoredSession> {
    const rows = await this.#sql<SessionRow[]>`
      SELECT owner_id, current_state
      FROM simulation_sessions
      WHERE id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      throw new SessionNotFoundError();
    }
    const [actionRows, evidenceRows, reflectionRows] = await Promise.all([
      this.#sql<{ sequence: number; action: unknown }[]>`
        SELECT sequence, action FROM action_log
        WHERE session_id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid
        ORDER BY sequence
      `,
      this.#sql<{ payload: unknown }[]>`
        SELECT jsonb_build_object(
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
        ) AS payload
        FROM evidence_signals
        WHERE session_id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid
      `,
      this.#sql<{ payload: unknown }[]>`
        SELECT jsonb_build_object(
          'id', id,
          'sessionId', session_id,
          'eventId', event_id,
          'enjoyment', enjoyment,
          'confidence', confidence,
          'note', note,
          'createdAt', created_at
        ) AS payload
        FROM reflections
        WHERE session_id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid
      `,
    ]);
    return {
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
  }

  async saveSession(session: StoredSession): Promise<void> {
    await this.#sql.begin(async (transaction) => {
      await transaction`
        UPDATE simulation_sessions
        SET current_state = ${transaction.json(session.state)}
        WHERE id = ${session.state.sessionId}::uuid
          AND owner_id = ${session.ownerId}::uuid
      `;
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
