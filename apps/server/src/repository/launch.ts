import type postgres from "postgres";
import type { LaunchEventSchema } from "@sim/schemas";
export class LaunchRateLimitError extends Error {}
export type LaunchEvent = ReturnType<typeof LaunchEventSchema.parse>;
export class PostgresLaunchStore {
  constructor(private readonly sql: ReturnType<typeof postgres>) {}
  async save(event: LaunchEvent, ownerId?: string): Promise<void> {
    await this.sql.begin(async (tx) => {
      const inserted =
        await tx`INSERT INTO launch_events (event_id, event_name, career_id)
        VALUES (${event.eventId}::uuid, ${event.name}, ${event.careerId ?? null}) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`;
      if (inserted.length === 0 || !ownerId) return;
      const limits = await tx<
        { event_count: number }[]
      >`INSERT INTO launch_event_limits (owner_id, event_count) VALUES (${ownerId}::uuid, 1)
        ON CONFLICT (owner_id) DO UPDATE SET
          event_count = CASE WHEN launch_event_limits.window_started_at < now() - interval '1 minute' THEN 1 ELSE launch_event_limits.event_count + 1 END,
          window_started_at = CASE WHEN launch_event_limits.window_started_at < now() - interval '1 minute' THEN now() ELSE launch_event_limits.window_started_at END
        RETURNING event_count`;
      if ((limits[0]?.event_count ?? 0) > 60) throw new LaunchRateLimitError();
    });
  }
}
