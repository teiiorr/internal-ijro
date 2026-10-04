import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: ["./src/lib/db/schema.ts", "./src/lib/db/tables/*.ts"],
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/ichki_ijro",
  },
  verbose: true,
  strict: true,
} satisfies Config;
