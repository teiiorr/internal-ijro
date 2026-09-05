// Simplify studio (kontragent) logins + passwords and print the credential list.
//
// Studios log in with users.email; the studio<->company<->project link resolves
// by EMAIL EQUALITY between users.email and external_companies.contact_email, so
// a login change MUST rewrite both columns together. Only position='kontragent'
// rows are ever touched — staff/owner accounts are never matched.
//
// Pure ESM + raw SQL through `postgres` (a prod dependency) and bcryptjs — no
// drizzle, no schema import, no tsx. Runs on prod with plain node.
//
//   node scripts/reset-studio-credentials.mjs                 # DRY RUN (prints the list, writes nothing)
//   node scripts/reset-studio-credentials.mjs --apply         # simplify BOTH login + password
//   node scripts/reset-studio-credentials.mjs --passwords-only # keep existing emails, reset passwords only
//   node scripts/reset-studio-credentials.mjs --apply --passwords-only
//   node scripts/reset-studio-credentials.mjs --domain=studiya.uz  # override login domain
//   node scripts/reset-studio-credentials.mjs --only="Bola Podkast" --passwords-only --apply
//                                                # reset ONE studio (name/email substring) — recovery tool
//
// Safe by default: nothing is written unless --apply is passed.

import { createRequire } from "node:module";
import { randomInt } from "node:crypto";

const require = createRequire(import.meta.url);
try {
  require("dotenv/config");
} catch {
  /* dotenv not installed in this env — DATABASE_URL already exported by the caller */
}
const postgres = require("postgres");
const bcrypt = require("bcryptjs");

// ---- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const PASSWORDS_ONLY = argv.includes("--passwords-only");
const DOMAIN = (argv.find((a) => a.startsWith("--domain=")) ?? "--domain=studiya.uz").split("=")[1];
const ONLY = (argv.find((a) => a.startsWith("--only=")) ?? "--only=").split("=").slice(1).join("=").trim().toLowerCase();
const BCRYPT_COST = 12; // must match src/lib/auth/password.ts

if (argv.includes("--help") || argv.includes("-h")) {
  console.log("Usage: node scripts/reset-studio-credentials.mjs [--apply] [--passwords-only] [--domain=studiya.uz]");
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

// ---- transliteration + slug (mirrors scripts/seed-studios.ts) --------------
const CYR = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "",
  э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h", і: "i",
};
// Uzbek-latin apostrophe forms → drop
const APOS = /['ʻʼ`''«»"""]/g;

function slugify(name, max = 40) {
  let s = String(name || "").toLowerCase().replace(APOS, " ");
  s = [...s].map((ch) => (CYR[ch] !== undefined ? CYR[ch] : ch)).join("");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  s = s.slice(0, max).replace(/-+$/g, "");
  return s || "studiya";
}

// Readable password: Capitalized word (>= 4 chars) + 4 random digits (>= 8 total).
function makePassword(slug) {
  let word = (slug.split("-")[0] || "studio").replace(/[^a-z0-9]/g, "");
  if (word.length < 4) word = "studio";
  word = word.slice(0, 10);
  const cap = word.charAt(0).toUpperCase() + word.slice(1);
  const digits = String(randomInt(1000, 10000)); // 1000-9999
  return `${cap}${digits}`;
}

const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);

async function main() {
  const sql = postgres(url, { max: 1 });

  // Host (redacted) so the operator can confirm they're on the right DB.
  const host = url.replace(/^\w+:\/\/[^@]*@/, "").split("/")[0];
  console.log(`\nDB: ${host}   mode: ${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"}   ${PASSWORDS_ONLY ? "passwords-only" : "login + password"}\n`);

  let companies = await sql`
    select id, name, contact_email, status
    from external_companies
    order by name
  `;

  if (ONLY) {
    companies = companies.filter(
      (c) => c.name.toLowerCase().includes(ONLY) || (c.contact_email ?? "").toLowerCase().includes(ONLY),
    );
    console.log(`--only="${ONLY}" → ${companies.length} matching studio(s)\n`);
    if (companies.length === 0) { await sql.end(); return; }
  }

  // Every existing email in the whole users table → uniqueness guard for new logins.
  const used = new Set();
  for (const u of await sql`select email from users`) used.add(u.email.toLowerCase());

  // kontragent users keyed by their (lowercased) email, to find each studio's login row.
  const kontragentByEmail = new Map();
  for (const u of await sql`select id, email from users where position = 'kontragent'`) {
    kontragentByEmail.set(u.email.toLowerCase(), u.id);
  }

  const plan = [];
  for (const c of companies) {
    const currentEmail = (c.contact_email ?? "").trim().toLowerCase();
    const userId = currentEmail ? kontragentByEmail.get(currentEmail) ?? null : null;
    const slug = slugify(c.name);

    if (PASSWORDS_ONLY) {
      if (!userId) {
        plan.push({ company: c, action: "skip", reason: "no linked kontragent user (use full mode to create one)", login: currentEmail || "—" });
        continue;
      }
      plan.push({ company: c, action: "reset-password", userId, login: currentEmail, password: makePassword(slug) });
      continue;
    }

    // Full mode: uniform login studio-<slug>@DOMAIN, unique across the users table.
    let login = `studio-${slug}@${DOMAIN}`;
    if (login !== currentEmail) {
      let n = 2;
      while (used.has(login)) { login = `studio-${slug}-${n}@${DOMAIN}`; n++; }
    }
    used.add(login);

    plan.push({
      company: c,
      action: userId ? "update" : "create",
      userId,
      login,
      oldLogin: currentEmail || "—",
      password: makePassword(slug),
      loginChanged: login !== currentEmail,
    });
  }

  // ---- print the plan -----------------------------------------------------
  console.log(pad("STUDIO", 34), pad("LOGIN", 40), pad("PASSWORD", 12), "ACTION");
  console.log("-".repeat(34), "-".repeat(40), "-".repeat(12), "------");
  for (const p of plan) {
    console.log(
      pad(p.company.name, 34),
      pad(p.login ?? "—", 40),
      pad(p.password ?? "—", 12),
      p.action + (p.reason ? ` (${p.reason})` : ""),
    );
  }

  const changed = plan.filter((p) => p.action !== "skip");
  const loginChanges = plan.filter((p) => p.loginChanged);
  console.log(`\n${companies.length} studios · ${changed.length} to change · ${loginChanges.length} login(s) changed · ${plan.filter((p) => p.action === "create").length} user(s) created · ${plan.filter((p) => p.action === "skip").length} skipped`);

  // ---- apply --------------------------------------------------------------
  if (APPLY) {
    let ok = 0;
    const errors = [];
    for (const p of plan) {
      if (p.action === "skip") continue;
      try {
        const hash = await bcrypt.hash(p.password, BCRYPT_COST);
        await sql.begin(async (tx) => {
          if (p.action === "create") {
            const [u] = await tx`
              insert into users (email, full_name, password_hash, position, status, email_verified_at)
              values (${p.login}, ${p.company.name.slice(0, 255) || "Studiya"}, ${hash}, 'kontragent', 'active', now())
              returning id
            `;
            await tx`insert into notification_settings (user_id) values (${u.id}) on conflict do nothing`;
            await tx`update external_companies set contact_email = ${p.login}, status = 'approved' where id = ${p.company.id}`;
          } else if (p.action === "update") {
            // Reset password + clear every login blocker (lockout, 2FA, blocked status).
            await tx`
              update users set
                email = ${p.login},
                password_hash = ${hash},
                status = 'active',
                failed_login_count = 0,
                locked_until = null,
                two_factor_enabled = false,
                two_factor_secret = null,
                updated_at = now()
              where id = ${p.userId} and position = 'kontragent'
            `;
            if (p.loginChanged) {
              await tx`update external_companies set contact_email = ${p.login}, status = 'approved' where id = ${p.company.id}`;
            }
          } else if (p.action === "reset-password") {
            await tx`
              update users set
                password_hash = ${hash},
                status = 'active',
                failed_login_count = 0,
                locked_until = null,
                two_factor_enabled = false,
                two_factor_secret = null,
                updated_at = now()
              where id = ${p.userId} and position = 'kontragent'
            `;
          }
        });
        ok++;
      } catch (e) {
        errors.push({ studio: p.company.name, error: String(e?.message ?? e) });
      }
    }
    console.log(`\n✓ Applied to ${ok} studios.` + (errors.length ? ` ${errors.length} failed:` : ""));
    for (const e of errors) console.log(`  ✗ ${e.studio}: ${e.error}`);

    // Authoritative credential list (copy this — plaintext passwords are NOT recoverable later).
    console.log("\n=== CREDENTIALS (save this — passwords are bcrypt-hashed and cannot be shown again) ===");
    console.log("login\tpassword\tstudio");
    for (const p of changed) console.log(`${p.login}\t${p.password}\t${p.company.name}`);
  } else {
    console.log("\nDRY RUN — nothing written. Re-run with --apply to perform the changes above.");
  }

  if (!PASSWORDS_ONLY && loginChanges.length) {
    console.log("\n⚠ Login emails changed. Note:");
    console.log("  • Any studio currently logged in must log OUT and back in (their session holds the old email).");
    console.log(`  • @${DOMAIN} is a no-inbox domain: those studios won't receive notification/reset emails — reset their password from the admin panel when needed.`);
  }

  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
