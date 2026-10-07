import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import type { SupportReport } from "@sim/schemas";
export class SupportRateLimitError extends Error {}
export interface SupportStore {
  save(ownerId: string, report: SupportReport): Promise<string>;
}
export class PostgresSupportStore implements SupportStore {
  constructor(private readonly sql: ReturnType<typeof postgres>) {}
  async save(ownerId: string, report: SupportReport): Promise<string> {
    return this.sql.begin(async (tx) => {
      // DB lock and quota survive restarts and apply across API replicas.
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${ownerId}, 7412))`;
      const existing = await tx<
        { id: string }[]
      >`SELECT id FROM support_reports WHERE owner_id = ${ownerId}::uuid AND create_request_id = ${report.createRequestId}::uuid`;
      if (existing[0]) return existing[0].id;
      const counts = await tx<
        { count: number }[]
      >`SELECT count(*)::int AS count FROM support_reports WHERE owner_id = ${ownerId}::uuid AND created_at > now() - interval '1 hour'`;
      if ((counts[0]?.count ?? 0) >= 5) throw new SupportRateLimitError();
      const rows = await tx<
        { id: string }[]
      >`INSERT INTO support_reports (owner_id, create_request_id, category, description, contact, diagnostics)
        VALUES (${ownerId}::uuid, ${report.createRequestId}::uuid, ${report.category}, ${report.description}, ${report.contact}, ${report.technicalDetails ? tx.json(report.technicalDetails) : null}) RETURNING id`;
      const row = rows[0];
      if (!row) throw new Error("Report was not saved");
      return row.id;
    });
  }
}
export class InMemorySupportStore implements SupportStore {
  private readonly rows = new Map<string, { id: string; time: number }>();
  async save(ownerId: string, report: SupportReport): Promise<string> {
    const key = `${ownerId}:${report.createRequestId}`;
    const existing = this.rows.get(key);
    if (existing) return existing.id;
    const recent = [...this.rows].filter(
      ([k, row]) =>
        k.startsWith(`${ownerId}:`) && row.time > Date.now() - 3600000,
    );
    if (recent.length >= 5) throw new SupportRateLimitError();
    const id = randomUUID();
    this.rows.set(key, { id, time: Date.now() });
    return id;
  }
}
