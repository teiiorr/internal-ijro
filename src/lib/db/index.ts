import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Build-tolerant Postgres client. Used to throw at module load if
 * DATABASE_URL was missing — that killed `next build` on platforms that
 * don't expose runtime envs at build time. Deferred until first query so
 * the build succeeds without a DB and only real requests fail loudly.
 */
type PgClient = ReturnType<typeof postgres>;

const globalForPg = globalThis as unknown as {
  _pgClient?: PgClient;
  _drizzleDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function getClient(): PgClient {
  if (globalForPg._pgClient) return globalForPg._pgClient;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = postgres(connectionString, { max: 10, prepare: false });
  globalForPg._pgClient = client;
  return client;
}

function getDb() {
  if (globalForPg._drizzleDb) return globalForPg._drizzleDb;
  globalForPg._drizzleDb = drizzle(getClient(), { schema });
  return globalForPg._drizzleDb;
}

/** Proxy that resolves the real drizzle instance on first property access. */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});

export { schema };
