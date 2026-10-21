// Özbek matnini yangi lotin alifbosiga (ö, ğ, ş, ç) ögiriş: kirill yozuvidan ham, eski lotindan
// (oʻ, gʻ, sh, ch) ham. Word hujjatida bitta söz bir neça "run"ga bölinib ketishi mumkin
// (masalan "s" qalin, "h" oddiy), şu bois matn bölaklar röyxati sifatida olinadi va har bir
// natija harfi uni boşlagan bölakka qaytariladi: formatlaş özgarmaydi.

/** Bölaklar orasidagi qattiq çegara (tab, qator uzilişi): söz u orqali davom etmaydi. */
export const BREAK = null;

const CYR_VOWELS = new Set("аеёиоуэюяўыАЕЁИОУЭЮЯЎЫ");
const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ғ: "ğ", д: "d", ж: "j", з: "z", и: "i", й: "y", к: "k", қ: "q",
  л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ў: "ö", ф: "f", х: "x",
  ҳ: "h", ч: "ç", ш: "ş", щ: "ş", ъ: "ʼ", ь: "", ы: "i", э: "e", ё: "yo", ю: "yu", я: "ya",
};
// oʻ / gʻ belgisi: ʻ va ‘ har doim harf; ' ’ ` ʼ esa faqat keyin harf kelsa (tirnoq emas).
const TURNED = new Set(["ʻ", "‘"]);
const AMBIGUOUS = new Set(["'", "’", "`", "ʼ"]);

const isCyr = (c: string) => /[Ѐ-ӿ]/.test(c);
const isLetter = (c: string | undefined) => !!c && /\p{L}/u.test(c);
const isUpper = (c: string) => c !== c.toLowerCase() && c === c.toUpperCase();
const caseLike = (src: string, out: string, allCaps: boolean) =>
  !isUpper(src) || !out ? out : allCaps ? out.toUpperCase() : out[0].toUpperCase() + out.slice(1);

export type ConvertStats = { changed: number; cyrillic: number; latin: number };

/**
 * Bölaklarni (null = qattiq çegara) yangi alifboga ögiradi. Qaytgan röyxat kirişdagi bilan bir xil
 * uzunlikda: null örnida null. URL va email manzillar, hamda c/w harfi bor (özbekça bölmagan)
 * lotin sözlari tegilmaydi.
 */
export function convertSegments(segments: (string | null)[]): { out: (string | null)[]; stats: ConvertStats } {
  const chars: string[] = [];
  const owner: number[] = [];
  segments.forEach((s, i) => {
    if (s === null) {
      chars.push("\u0000");
      owner.push(-1);
    } else {
      for (const c of Array.from(s)) {
        chars.push(c);
        owner.push(i);
      }
    }
  });

  // Himoyalangan joylar: URL, email va özbekça bölmagan lotin sözlar.
  const keep = new Array<boolean>(chars.length).fill(false);
  const joined = chars.join("");
  const offsets: number[] = [];
  let off = 0;
  for (const c of chars) {
    offsets.push(off);
    off += c.length;
  }
  const idxAt = (strOff: number) => {
    let lo = 0;
    let hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= strOff) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const protect = (re: RegExp) => {
    for (const m of joined.matchAll(re)) {
      const a = idxAt(m.index ?? 0);
      const b = idxAt((m.index ?? 0) + m[0].length - 1);
      for (let k = a; k <= b; k++) keep[k] = true;
    }
  };
  protect(/(?:https?:\/\/|www\.)[^\s\u0000]+/gi);
  protect(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g);
  for (const m of joined.matchAll(/[A-Za-z][A-Za-z'’ʻʼ‘`]*/g)) {
    if (/w|c(?!h)/i.test(m[0])) {
      const a = idxAt(m.index ?? 0);
      const b = idxAt((m.index ?? 0) + m[0].length - 1);
      for (let k = a; k <= b; k++) keep[k] = true;
    }
  }

  // Söz çegaralari (kirill e/ц qoidasi va BOŞ HARFLI sözlar uçun).
  const wordStart = new Array<number>(chars.length).fill(0);
  const allCaps = new Array<boolean>(chars.length).fill(false);
  for (let i = 0; i < chars.length; ) {
    if (!isLetter(chars[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < chars.length && (isLetter(chars[j]) || (AMBIGUOUS.has(chars[j]) || TURNED.has(chars[j])) && isLetter(chars[j + 1]))) j++;
    const letters = chars.slice(i, j).filter(isLetter);
    const caps = letters.length > 1 && letters.every((c) => !/\p{Ll}/u.test(c));
    for (let k = i; k < j; k++) {
      wordStart[k] = i;
      allCaps[k] = caps;
    }
    i = j;
  }

  const out: string[] = segments.map(() => "");
  const stats: ConvertStats = { changed: 0, cyrillic: 0, latin: 0 };
  const emit = (i: number, s: string) => {
    if (owner[i] >= 0) out[owner[i]] += s;
  };

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (owner[i] < 0) continue;
    if (keep[i]) {
      emit(i, c);
      continue;
    }
    if (isCyr(c)) {
      const lower = c.toLowerCase();
      let r = CYR[lower];
      if (r === undefined) {
        // е va ц: söz boşida / unlidan keyin boşqaça yoziladi.
        const prev = i > wordStart[i] ? chars[i - 1] : "";
        if (lower === "е") r = !prev || CYR_VOWELS.has(prev) || /[ъьЪЬ]/.test(prev) ? "ye" : "e";
        else if (lower === "ц") r = prev && CYR_VOWELS.has(prev) ? "ts" : "s";
        else {
          emit(i, c);
          continue;
        }
      }
      emit(i, caseLike(c, r, allCaps[i]));
      stats.changed++;
      stats.cyrillic++;
      continue;
    }
    const next = chars[i + 1];
    const lower = c.toLowerCase();
    if ((lower === "s" || lower === "c") && next && next.toLowerCase() === "h" && !keep[i + 1] && owner[i + 1] >= 0) {
      emit(i, lower === "s" ? (isUpper(c) ? "Ş" : "ş") : isUpper(c) ? "Ç" : "ç");
      i++;
      stats.changed++;
      stats.latin++;
      continue;
    }
    if ((lower === "o" || lower === "g") && next && owner[i + 1] >= 0 && !keep[i + 1]) {
      const mark = TURNED.has(next) || (AMBIGUOUS.has(next) && isLetter(chars[i + 2]));
      if (mark) {
        emit(i, lower === "o" ? (isUpper(c) ? "Ö" : "ö") : isUpper(c) ? "Ğ" : "ğ");
        i++;
        stats.changed++;
        stats.latin++;
        continue;
      }
    }
    emit(i, c);
  }

  return { out: segments.map((s, i) => (s === null ? null : out[i])), stats };
}

/** Bitta satr uçun qisqa yöl (fayl nomi va h.k.). */
export function toNewLatin(text: string): string {
  return convertSegments([text]).out[0] ?? text;
}
