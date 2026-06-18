// dotenv is a dev convenience. In production the caller (deploy.sh) sources
// .env.production into the shell before running this script, so a missing
// dotenv install should not abort migration.
import { createRequire } from "node:module";
try {
  createRequire(import.meta.url)("dotenv/config");
} catch {
  /* not installed in this environment — env already loaded by caller */
}
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

async function main() {
  const sql = postgres(url!, { max: 1 });
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  await sql.end();
  console.log("✓ Migrations applied");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
