// Ismlarni til böyiça körsatiş. Ismlar özbek lotinida saqlanadi; kirill va rus
// interfeyslari uçun ularni transliteratsiya qilamiz — şunda "Ahmedov" "Аҳмедов" bölib körinadi.

const APOS = /['ʻʼ`‘’]/g;

// yakka harflar (kiçik harfli kalitlar)
const UZ: Record<string, string> = {
  a: "а", b: "б", c: "с", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж",
  k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т",
  u: "у", v: "в", w: "в", x: "х", y: "й", z: "з",
};
// Ruscha uslub bir neça harfda farq qiladi (ҳ/ғ/қ/ў yöq)
const RU: Record<string, string> = { ...UZ, h: "х", q: "к" };

// digraflar (apostroflar allaqaçon ' ga keltirilgan); tartib muhim
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
    else if (ch !== "'") out += ch; // ismlardagi ortib qolgan tutuq belgisini olib taşlaymiz
    i++;
  }
  return out;
}

/** "Familiya Ism Otchestvo" dan otaning ismini (3-söz) olib taşlaydi. */
export function shortName(name: string | null | undefined): string {
  if (!name) return name ?? "";
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name.trim();
  return parts.slice(0, 2).join(" ");
}

/** Odamning ismini joriy interfeys tiliga moslaydi. */
export function localizeName(name: string | null | undefined, locale: string): string {
  if (!name) return name ?? "";
  const short = shortName(name);
  if (locale === "uz-cyrl") return translit(short, UZ, UZ_DI);
  if (locale === "ru") return translit(short, RU, RU_DI);
  return short;
}
