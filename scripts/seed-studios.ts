import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../src/lib/db/schema";

/**
 * Give every studio (external_companies) a login account so they can access the
 * contractor portal. Studios are linked to their user by email === contactEmail,
 * so we generate a stable slug email from the company name (if it has none) and
 * create a kontragent user with a shared default password.
 *
 * Idempotent: re-running skips companies that already have a matching user.
 *
 *   pnpm db:seed:studios
 */

const DOMAIN = "studiya.markaz-ijro.uz";
const PASSWORD = "studiya123";

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "",
  э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h", і: "i",
};

function slugify(name: string): string {
  let s = name.toLowerCase().replace(/['’"«»`”“]/g, " ");
  s = [...s].map((ch) => (CYR[ch] !== undefined ? CYR[ch] : ch)).join("");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  s = s.slice(0, 42).replace(/-+$/g, "");
  return s || "studiya";
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql, { schema });
  const hash = await bcrypt.hash(PASSWORD, 12);

  const companies = await db.select().from(schema.externalCompanies).orderBy(schema.externalCompanies.name);
  const used = new Set<string>();
  for (const u of await db.select({ email: schema.users.email }).from(schema.users)) used.add(u.email.toLowerCase());

  const rows: { name: string; email: string }[] = [];

  for (const c of companies) {
    let email = (c.contactEmail ?? "").trim().toLowerCase();
    if (!email) {
      const base = slugify(c.name);
      email = `${base}@${DOMAIN}`;
      let n = 2;
      while (used.has(email)) { email = `${base}-${n}@${DOMAIN}`; n++; }
    }
    used.add(email);

    const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (existing.length === 0) {
      const [u] = await db
        .insert(schema.users)
        .values({
          email,
          fullName: (c.name.replace(/["'«»”“]/g, "").trim().slice(0, 255)) || "Studiya",
          position: "kontragent",
          status: "active",
          passwordHash: hash,
        })
        .returning({ id: schema.users.id });
      // Default notification settings (mirrors the self-registration flow).
      await db.insert(schema.notificationSettings).values({ userId: u.id }).onConflictDoNothing();
    }

    if (c.contactEmail !== email || c.status !== "approved") {
      await db
        .update(schema.externalCompanies)
        .set({ contactEmail: email, status: "approved" })
        .where(eq(schema.externalCompanies.id, c.id));
    }

    rows.push({ name: c.name, email });
  }

  console.log("=== STUDIO LOGINS (email <TAB> studio) — password for all: " + PASSWORD + " ===");
  for (const r of rows) console.log(`${r.email}\t${r.name}`);
  console.log(`\nTotal: ${rows.length} studios. Shared password: ${PASSWORD}`);

  await sql.end();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
