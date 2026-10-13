#!/usr/bin/env node
/**
 * i18n message-file linter.
 *
 * Loads every `src/messages/<locale>.json`, flattens their keys, and checks:
 *
 *   (a) KEY SYNC — every locale must have exactly the same set of keys as the
 *       reference locale (uz-latn). Any missing or extra key FAILS the run
 *       (exit 1) and the offending keys are printed per locale.
 *
 *   (b) UNTRANSLATED — keys whose value in uz-cyrl / oz / ru is byte-identical
 *       to the uz-latn value are likely untranslated. These only WARN (never
 *       fail), reported as a per-locale count with a sample of the keys.
 *
 * Pure Node stdlib + no dependencies. Run with:  node scripts/check-i18n.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = join(__dirname, "..", "src", "messages");

/** Reference locale: its key set is canonical, its values are the base for the untranslated check. */
const REFERENCE = "uz-latn";
/** All locales, reference first. */
const LOCALES = ["uz-latn", "uz-cyrl", "oz", "ru"];
/** How many example keys to print per diagnostic before truncating. */
const SAMPLE = 25;

/**
 * Flatten a nested message object into a `{ "a.b.c": value }` map.
 * Objects recurse; arrays recurse by index; everything else is a leaf.
 */
function flatten(obj, prefix = "", out = {}) {
  if (obj !== null && typeof obj === "object") {
    const entries = Array.isArray(obj)
      ? obj.map((v, i) => [String(i), v])
      : Object.entries(obj);
    for (const [k, v] of entries) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else {
    out[prefix] = obj;
  }
  return out;
}

function load(locale) {
  const file = join(MESSAGES_DIR, `${locale}.json`);
  try {
    return flatten(JSON.parse(readFileSync(file, "utf8")));
  } catch (err) {
    console.error(`✗ Could not read/parse ${file}: ${err.message}`);
    process.exit(1);
  }
}

function sampleList(keys) {
  const shown = keys.slice(0, SAMPLE).map((k) => `      - ${k}`);
  if (keys.length > SAMPLE) shown.push(`      … and ${keys.length - SAMPLE} more`);
  return shown.join("\n");
}

// ── Load ─────────────────────────────────────────────────────────────────
const flat = Object.fromEntries(LOCALES.map((l) => [l, load(l)]));
const refKeys = new Set(Object.keys(flat[REFERENCE]));

console.log("i18n check — messages in src/messages/\n");
console.log(`Reference locale: ${REFERENCE} (${refKeys.size} keys)\n`);

// ── (a) Key sync ───────────────────────────────────────────────────────────
let keySyncFailed = false;

for (const locale of LOCALES) {
  if (locale === REFERENCE) continue;
  const keys = new Set(Object.keys(flat[locale]));
  const missing = [...refKeys].filter((k) => !keys.has(k)); // in ref, absent here
  const extra = [...keys].filter((k) => !refKeys.has(k)); // here, absent from ref

  if (missing.length === 0 && extra.length === 0) {
    console.log(`  ✓ ${locale.padEnd(8)} ${keys.size} keys — in sync`);
  } else {
    keySyncFailed = true;
    console.log(`  ✗ ${locale.padEnd(8)} ${keys.size} keys — OUT OF SYNC`);
    if (missing.length) {
      console.log(`    missing (${missing.length}) — present in ${REFERENCE}, absent here:`);
      console.log(sampleList(missing));
    }
    if (extra.length) {
      console.log(`    extra (${extra.length}) — present here, absent from ${REFERENCE}:`);
      console.log(sampleList(extra));
    }
  }
}

// ── (b) Untranslated (byte-identical to reference) ─────────────────────────
console.log("\nUntranslated check (value byte-identical to " + REFERENCE + "):");

const untranslatedCounts = {};
for (const locale of LOCALES) {
  if (locale === REFERENCE) continue;
  const identical = [];
  for (const key of refKeys) {
    const refVal = flat[REFERENCE][key];
    const val = flat[locale][key];
    if (val === undefined) continue; // key-sync already reported this
    if (typeof refVal === "string" && val === refVal && refVal !== "") {
      identical.push(key);
    }
  }
  untranslatedCounts[locale] = identical.length;
  if (identical.length === 0) {
    console.log(`  ✓ ${locale.padEnd(8)} no values identical to ${REFERENCE}`);
  } else {
    console.log(`  ! ${locale.padEnd(8)} ${identical.length} value(s) identical to ${REFERENCE} (likely untranslated)`);
    console.log(sampleList(identical));
  }
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log("\nSummary");
console.log(`  locales checked : ${LOCALES.join(", ")}`);
console.log(`  reference keys  : ${refKeys.size}`);
console.log(`  key sync        : ${keySyncFailed ? "FAIL" : "PASS"}`);
console.log(
  "  untranslated    : " +
    LOCALES.filter((l) => l !== REFERENCE)
      .map((l) => `${l}=${untranslatedCounts[l] ?? 0}`)
      .join(", ") +
    " (warning only)",
);

if (keySyncFailed) {
  console.error("\n✗ i18n check FAILED: locale key sets are out of sync (see above).");
  process.exit(1);
}

console.log("\n✓ i18n check passed: all locales key-synced.");
process.exit(0);
