import type postgres from "postgres";

export const RETENTION_BATCH_SIZE = 100;
export const RETENTION_INTERVAL_MS = 60 * 60 * 1000;
const MAX_BATCHES = 100;

/** Database time, immutable creation time, and cascades define the expiry boundary. */
export async function purgeExpiredSessions(
  sql: postgres.Sql | postgres.TransactionSql,
): Promise<number> {
  const removed = await sql`
    WITH expired AS (
      SELECT id FROM simulation_sessions
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
      ORDER BY created_at, id
      LIMIT ${RETENTION_BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM simulation_sessions AS session
    USING expired
    WHERE session.id = expired.id
    RETURNING session.id
  `;
  return removed.length;
}

/** Bounded drain; another scheduled run handles a large backlog or locked rows. */
export async function runSessionRetention(
  purge: () => Promise<number>,
  stopped: () => boolean = () => false,
): Promise<{ deleted: number; more: boolean }> {
  let deleted = 0;
  for (let batch = 0; batch < MAX_BATCHES && !stopped(); batch++) {
    const count = await purge();
    deleted += count;
    if (count < RETENTION_BATCH_SIZE) return { deleted, more: false };
  }
  return { deleted, more: true };
}

/** Starts immediately and hourly; prevents overlap and drains safely on shutdown. */
export function startSessionRetention(
  purge: () => Promise<number>,
  onResult: (result: { deleted: number; more: boolean }) => void,
  onError: () => void,
): () => Promise<void> {
  let stopped = false;
  let running: Promise<void> | undefined;
  function run() {
    if (stopped || running) return;
    running = runSessionRetention(purge, () => stopped)
      .then(onResult)
      .catch(onError)
      .finally(() => { running = undefined; });
  }
  const timer = setInterval(run, RETENTION_INTERVAL_MS);
  timer.unref();
  run();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await running;
  };
}
