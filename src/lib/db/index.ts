import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Build'ga çidamli Postgres klienti. Ilgari DATABASE_URL yöq bölsa modul yuklanişida
 * xatolik taşlardi — bu build vaqtida runtime env'larni bermaydigan platformalarda
 * `next build`'ni öldirardi. Endi birinçi sörovgaça keçiktiriladi, şunda build DB'siz
 * ham muvaffaqiyatli ötadi va faqat haqiqiy sörovlar oçiq-oydin xatolik beradi.
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

/** Birinçi marta xususiyatga murojaat qilinganda haqiqiy drizzle nusxasini oladigan Proxy. */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});

export { schema };
