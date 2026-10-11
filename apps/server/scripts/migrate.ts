import postgres from "postgres";
import { poolerCompatibleOptions } from "../src/db/connection.js";
import {
  discoverMigrations,
  migrate,
  verifyMigrations,
} from "../src/db/migrations.js";
const migrations = await discoverMigrations();
if (process.argv.includes("--plan")) {
  console.log(migrations.map(({ name, hash }) => `${name} ${hash}`).join("\n"));
} else {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required; no implicit database target");
  const sql = postgres(process.env.DATABASE_URL, {
    ...poolerCompatibleOptions,
    max: 1,
    connect_timeout: 5,
    idle_timeout: 5,
    connection: { statement_timeout: 30000 },
  });
  try {
    if (process.argv.includes("--verify")) {
      await verifyMigrations(sql, migrations);
      console.log("Migration history verified; no pending SQL");
    } else {
      console.log({ applied: await migrate(sql, migrations) });
    }
  } catch {
    console.error(
      "Migration failed. No credentials printed. Check schema/history and database connectivity.",
    );
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}
