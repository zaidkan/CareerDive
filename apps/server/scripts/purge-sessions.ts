import postgres from "postgres";
import { poolerCompatibleOptions } from "../src/db/connection.js";
import { verifyMigrations } from "../src/db/migrations.js";
import { purgeExpiredSessions, runSessionRetention } from "../src/db/retention.js";

if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is required; no implicit database target");
const sql = postgres(process.env.DATABASE_URL, {
  ...poolerCompatibleOptions,
  max: 1,
  connect_timeout: 5,
  connection: { statement_timeout: 5000 },
});
try {
  await verifyMigrations(sql);
  const result = await runSessionRetention(() => purgeExpiredSessions(sql));
  console.log(result);
  if (result.more) process.exitCode = 1;
} catch {
  console.error("Session retention failed. Check database connectivity and migration history; no credentials printed.");
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
