import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// "use server" moduli faqat async funksiyalarni eksport qila oladi. Boshqa eksport
// (masalan `export const flag = true`) prod'da butun modulni yiqitadi:
// "A 'use server' file can only export async functions, found boolean" va shu fayldagi
// BARCHA amallar ishlamay qoladi (2026-10-14 da xodim profilini saqlash shu sababli buzilgan).

const SRC = path.resolve(__dirname, "../..");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

function isUseServerModule(src: string): boolean {
  // Direktiva fayl boshida (izohlardan keyin) turishi kerak.
  const body = src.replace(/^(\s*(\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*/, "");
  return /^["']use server["']/.test(body);
}

const ALLOWED = /^export\s+(async\s+function\b|default\s+async\s+function\b|type\s|interface\s|const\s+\w+\s*=\s*async\b)/;

const files = walk(SRC).filter((f) => isUseServerModule(fs.readFileSync(f, "utf8")));

describe('"use server" modules', () => {
  it("are discovered", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [path.relative(SRC, f), f]))("%s exports only async functions", (_rel, file) => {
    const bad = fs
      .readFileSync(file, "utf8")
      .split("\n")
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => /^export\s/.test(line) && !ALLOWED.test(line))
      .map(({ line, n }) => `${n}: ${line}`);
    expect(bad).toEqual([]);
  });
});
