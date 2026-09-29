import postgres from "postgres";
import type { CareerId } from "../domain/career-requests.js";

export interface CareerRequestStore {
  getState(requesterKey: string): Promise<CareerId[]>;
  setRequested(requesterKey: string, careerId: CareerId, requested: boolean): Promise<void>;
}

export class PostgresCareerRequestStore implements CareerRequestStore {
  constructor(private readonly sql: ReturnType<typeof postgres>) {}

  async getState(requesterKey: string): Promise<CareerId[]> {
    const rows = await this.sql<{ career_id: CareerId }[]>`
      SELECT career_id FROM career_requests
      WHERE requester_key = ${requesterKey}::uuid AND unrequested_at IS NULL
      ORDER BY career_id
    `;
    return rows.map(({ career_id }) => career_id);
  }

  async setRequested(requesterKey: string, careerId: CareerId, requested: boolean): Promise<void> {
    if (requested) {
      await this.sql`
        INSERT INTO career_requests (requester_key, career_id)
        VALUES (${requesterKey}::uuid, ${careerId})
        ON CONFLICT (requester_key, career_id) DO UPDATE
          SET unrequested_at = NULL, last_action_at = now()
          WHERE career_requests.unrequested_at IS NOT NULL
      `;
    } else {
      await this.sql`
        UPDATE career_requests
        SET unrequested_at = now(), last_action_at = now()
        WHERE requester_key = ${requesterKey}::uuid
          AND career_id = ${careerId} AND unrequested_at IS NULL
      `;
    }
  }
}

export class InMemoryCareerRequestStore implements CareerRequestStore {
  private readonly active = new Map<string, Set<CareerId>>();

  async getState(requesterKey: string): Promise<CareerId[]> {
    return [...(this.active.get(requesterKey) ?? [])].sort();
  }

  async setRequested(requesterKey: string, careerId: CareerId, requested: boolean): Promise<void> {
    if (requested) {
      const careers = this.active.get(requesterKey) ?? new Set<CareerId>();
      careers.add(careerId);
      this.active.set(requesterKey, careers);
    } else {
      const careers = this.active.get(requesterKey);
      careers?.delete(careerId);
      if (careers?.size === 0) this.active.delete(requesterKey);
    }
  }
}
