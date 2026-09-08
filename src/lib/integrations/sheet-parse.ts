// Google Sheets CSV hisobotini tahlil qiluvchi SOF modul (I/O, DB, server-only
// yöq) — şu bois uni alohida test qilib köriş mumkin. sheet-status.ts şu yerdan
// import qiladi.

export type SheetRow = { name: string; status: string };

// --- RFC 4180 CSV tahlilçisi: qöştirnoq içidagi vergul va yangi qatorlarni toğri
// hisobga oladi (holat va mas'ul kataklarida vergul/yangi qator uçraydi). ---
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } // "" → qöştirnoq
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// --- Kirill → lotin skeleti: ikkala alifboni ham bir xil ASCII "skelet"ga
// keltiradi, şunda "Орзу-ҳавас" va "Orzu-havas" bir xil kalitga tuşadi. ---
// ў va ғ ni oddiy o/g dan AYRIB saqlaymiz (ў→"w", ғ→"gg"): aks holda «Тўр» va
// «Тор» bir xil skeletга tuşib, boşqa loyihaning holati notoğri yozilardi.
const CYR2LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ғ: "gg", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", қ: "q", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ў: "w", ф: "f", х: "x", ҳ: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
};

function cyrToLat(s: string): string {
  let out = "";
  for (const ch of s) {
    const low = ch.toLowerCase();
    out += Object.prototype.hasOwnProperty.call(CYR2LAT, low) ? CYR2LAT[low] : ch;
  }
  return out;
}

/**
 * Nomni moslaştiriş uçun barqaror skeletga aylantiradi: qöştirnoq içidagi
 * sarlavhani ajratadi (masalan «Дайи» Бадиий фильм → «Дайи»), kirillni lotinga
 * ögiradi, kiçik harf, harf-raqamdan boşqasini olib taşlaydi. Böşda böş kalit.
 */
export function normalizeName(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();
  const m = s.match(/["“”«»„‟]([^"“”«»„‟]+)["“”«»„‟]/);
  if (m && m[1].trim()) s = m[1];
  s = s.toLowerCase();
  // Lotin tarafidagi oʻ/gʻ digraflarini kirilldagi ў/ғ bilan bir xil belgига
  // keltiramiz (w / gg), toki apostrof olib taşlanganda o/g bilan qöşilib
  // ketmasin. Kirill ў→"w", ғ→"gg" (CYR2LAT).
  s = s.replace(/o[ʻʼ'`’]/g, "w").replace(/g[ʻʼ'`’]/g, "gg");
  s = cyrToLat(s);
  // Skriptlararo bir xillik: y-glide (ye/ya/yo/yu) unlisi va ц/ts farqini
  // yöqotamiz — «Ер»/"Yer", «Акция»/"Aksiya" bir xil skeletга tuşsin.
  s = s.replace(/y(?=[aeiou])/g, "").replace(/ts/g, "s");
  return s.replace(/[^a-z0-9]+/g, "");
}

/**
 * CSV panjarasidan (name, status) juftliklarini ajratib oladi. Ustun indekslari
 * har bölimning sarlavha qatoridan ("Лойиҳа номи" + "Лойиҳа ҳолати") moslaşuvçan
 * aniqlanadi — bölimlar orasida ustunlar surilsa ham işlaydi.
 */
// Sarlavha kataklarini QAT'IY tanib olamiz: nom uçun "лойиҳа"+"ном", holat uçun
// "лойиҳа"+"ҳолат" birga bölişi şart. Şu tariqa «Студия номи» yoki «Молиявий
// ҳолати» kabi ustunlar noörin tanlanmaydi (aks holda kelajakda ustun qöşilsa
// holat notoğri ustundan öqilib, hammasi buzilardi).
const isNameHeader = (c: string) => /лойиҳа|loyiha/i.test(c) && /ном|nom/i.test(c);
const isStatusHeader = (c: string) => /лойиҳа|loyiha/i.test(c) && /ҳолат|холат|holat/i.test(c);

export function extractRows(grid: string[][]): SheetRow[] {
  const out: SheetRow[] = [];
  let nameCol = -1;
  let statusCol = -1;
  for (const row of grid) {
    const cells = row.map((c) => (c ?? "").trim());
    const hName = cells.findIndex(isNameHeader);
    const hStatus = cells.findIndex(isStatusHeader);
    // Ikkalasi ham topilsa VA ular boşqa-boşqa ustun bölsa → sarlavha qatori.
    if (hName !== -1 && hStatus !== -1 && hName !== hStatus) { nameCol = hName; statusCol = hStatus; continue; }
    if (nameCol === -1 || statusCol === -1) continue;
    const name = cells[nameCol] ?? "";
    const status = cells[statusCol] ?? "";
    if (!name || !status) continue;
    if (!/[A-Za-zА-Яа-яЁёҲҳҚқҒғЎў]/.test(name)) continue; // raqamli/subtotal qatorlarni öтказамиз
    out.push({ name, status });
  }
  return out;
}
