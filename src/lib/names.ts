// Display names by locale. Names are stored in Uzbek Latin; for the Cyrillic
// and Russian UIs we transliterate them so "Ahmedov" shows as "Аҳмедов".

const APOS = /['ʻʼ`‘’]/g;

// single letters (lowercase keys)
const UZ: Record<string, string> = {
  a: "а", b: "б", c: "с", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж",
  k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т",
  u: "у", v: "в", w: "в", x: "х", y: "й", z: "з",
};
// Russian-style differs for a few letters (no ҳ/ғ/қ/ў)
const RU: Record<string, string> = { ...UZ, h: "х", q: "к" };

// digraphs (apostrophes already normalized to '); order matters
const UZ_DI: [string, string][] = [
  ["o'", "ў"], ["g'", "ғ"], ["yo", "ё"], ["yu", "ю"], ["ya", "я"], ["ye", "е"], ["sh", "ш"], ["ch", "ч"], ["ts", "ц"],
];
const RU_DI: [string, string][] = [
  ["o'", "у"], ["g'", "г"], ["yo", "ё"], ["yu", "ю"], ["ya", "я"], ["ye", "е"], ["sh", "ш"], ["ch", "ч"], ["ts", "ц"],
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function translit(input: string, map: Record<string, string>, di: [string, string][]): string {
  const s = input.replace(APOS, "'");
  let out = "";
  let i = 0;
  while (i < s.length) {
    let hit = false;
    for (const [d, c] of di) {
      const seg = s.substr(i, d.length);
      if (seg.toLowerCase() === d) {
        out += seg[0] !== seg[0].toLowerCase() ? cap(c) : c;
        i += d.length;
        hit = true;
        break;
      }
    }
    if (hit) continue;
    const ch = s[i];
    const low = ch.toLowerCase();
    const c = map[low];
    if (c) out += ch !== low ? cap(c) : c;
    else if (ch !== "'") out += ch; // drop the leftover tutuq belgisi in names
    i++;
  }
  return out;
}

/** Localize a person's name for the current UI language. */
export function localizeName(name: string | null | undefined, locale: string): string {
  if (!name) return name ?? "";
  if (locale === "uz-cyrl") return translit(name, UZ, UZ_DI);
  if (locale === "ru") return translit(name, RU, RU_DI);
  return name;
}
