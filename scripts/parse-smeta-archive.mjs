// One-off: parse the consolidated Smeta-komissiyasi protocol (.md) into a
// structured JSON the app's archive UI renders. Re-run if the source changes.
//   node scripts/parse-smeta-archive.mjs
import fs from "node:fs";
import path from "node:path";

const SRC = process.env.SMETA_SRC
  || "/Users/teiior_dev/Desktop/Smeta-komissiyasi-2026-yigma-bayonnoma.md";
const OUT = path.resolve("src/data/smeta-archive.json");

const raw = fs.readFileSync(SRC, "utf8");
const lines = raw.split("\n");

const tableCell = (label) => {
  const re = new RegExp(`\\|\\s*\\*\\*${label}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`);
  for (const l of lines) { const m = l.match(re); if (m) return m[1].trim(); }
  return null;
};

const meetings = [];
let cur = null;   // current meeting
let item = null;  // current item (bayon/xulosa)
let buf = [];

function flushItem() {
  if (item) {
    item.text = buf.join("\n").trim();
    delete item._metaParsed;
    cur.items.push(item);
    item = null;
    buf = [];
  }
}

for (const line of lines) {
  const mMeet = line.match(/^##\s+(\d+)-yig.*?—\s*(.+?)\s*\((\d{4}-\d{2}-\d{2})\)\s*$/);
  if (mMeet) {
    flushItem();
    if (cur) meetings.push(cur);
    cur = { no: Number(mMeet[1]), dateLabel: mMeet[2].trim(), date: mMeet[3], items: [] };
    continue;
  }
  if (!cur) continue;

  const mBayon = line.match(/^###\s+(\d+)-bayon\s*$/);
  if (mBayon) { flushItem(); item = { kind: "bayon", no: Number(mBayon[1]), title: `${mBayon[1]}-bayon` }; continue; }

  const mXul = line.match(/^###\s+Xulosa\s+№\s*(\d+)\s*—\s*(.+?)\s*$/);
  if (mXul) { flushItem(); item = { kind: "xulosa", no: Number(mXul[1]), title: mXul[2].trim() }; continue; }

  if (item && !item._metaParsed && /^\*\*Sana:\*\*/.test(line)) {
    item.turi = (line.match(/\*\*Turi:\*\*\s*([^·]+?)\s*(?:·|$)/) || [])[1]?.trim() || null;
    item.sourceFile = (line.match(/\*\*Manba fayl:\*\*\s*`([^`]+)`/) || [])[1] || null;
    item._metaParsed = true;
    continue;
  }

  if (line.trim() === "---" || line.startsWith("<a id") || /^#\s+Yig/.test(line)) continue;
  if (item) buf.push(line);
}
flushItem();
if (cur) meetings.push(cur);

const documentsCount = meetings.reduce((n, m) => n + m.items.length, 0);
const out = {
  title: "Smeta komissiyasi",
  subtitle: "Yig‘ma bayonnoma va xulosalar to‘plami",
  period: tableCell("Davr"),
  compiledAt: tableCell("Yig‘ilgan sana"),
  meetingsCount: meetings.length,
  documentsCount,
  meetings,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`✓ ${meetings.length} meetings, ${documentsCount} documents → ${OUT} (${kb} KB)`);
