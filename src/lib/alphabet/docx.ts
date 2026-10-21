import "server-only";
import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";
import { convertSegments, BREAK, type ConvertStats } from "./new-latin";

// DOCX (ZIP + XML) içidagi matnni yangi alifboga ögiradi, qolgan hamma narsa (uslublar, jadvallar,
// rasmlar, maydon kodlari) bayt-bayt saqlanadi: faqat matni özgargan <w:t> tegilarigina qayta yoziladi.

export class DocxError extends Error {}

type Entry = {
  name: Buffer;
  versionMadeBy: number;
  versionNeeded: number;
  flags: number;
  method: number;
  time: number;
  date: number;
  crc: number;
  compSize: number;
  size: number;
  intAttr: number;
  extAttr: number;
  data: Buffer;
};

function readZip(buf: Buffer): Entry[] {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new DocxError("not_docx");
  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (count === 0xffff || cdOffset === 0xffffffff) throw new DocxError("unsupported");
  const entries: Entry[] = [];
  let p = cdOffset;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new DocxError("not_docx");
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const compSize = buf.readUInt32LE(p + 20);
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new DocxError("not_docx");
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    entries.push({
      name: buf.subarray(p + 46, p + 46 + nameLen),
      versionMadeBy: buf.readUInt16LE(p + 4),
      versionNeeded: buf.readUInt16LE(p + 6),
      flags: buf.readUInt16LE(p + 8),
      method: buf.readUInt16LE(p + 10),
      time: buf.readUInt16LE(p + 12),
      date: buf.readUInt16LE(p + 14),
      crc: buf.readUInt32LE(p + 16),
      compSize,
      size: buf.readUInt32LE(p + 24),
      intAttr: buf.readUInt16LE(p + 36),
      extAttr: buf.readUInt32LE(p + 38),
      data: buf.subarray(start, start + compSize),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function writeZip(entries: Entry[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const flags = e.flags & ~0x0008; // ma'lumot deskriptorisiz: ölçamlar sarlavhada
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(e.versionNeeded, 4);
    h.writeUInt16LE(flags, 6);
    h.writeUInt16LE(e.method, 8);
    h.writeUInt16LE(e.time, 10);
    h.writeUInt16LE(e.date, 12);
    h.writeUInt32LE(e.crc >>> 0, 14);
    h.writeUInt32LE(e.compSize, 18);
    h.writeUInt32LE(e.size, 22);
    h.writeUInt16LE(e.name.length, 26);
    h.writeUInt16LE(0, 28);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(e.versionMadeBy, 4);
    c.writeUInt16LE(e.versionNeeded, 6);
    c.writeUInt16LE(flags, 8);
    c.writeUInt16LE(e.method, 10);
    c.writeUInt16LE(e.time, 12);
    c.writeUInt16LE(e.date, 14);
    c.writeUInt32LE(e.crc >>> 0, 16);
    c.writeUInt32LE(e.compSize, 20);
    c.writeUInt32LE(e.size, 24);
    c.writeUInt16LE(e.name.length, 28);
    c.writeUInt16LE(e.intAttr, 36);
    c.writeUInt32LE(e.extAttr, 38);
    c.writeUInt32LE(offset, 42);
    parts.push(h, e.name, e.data);
    central.push(c, e.name);
    offset += 30 + e.name.length + e.data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}

const decode = (s: string) =>
  s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (k === "amp") return "&";
    if (k === "lt") return "<";
    if (k === "gt") return ">";
    if (k === "quot") return '"';
    if (k === "apos") return "'";
    const code = k.startsWith("#x") ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : m;
  });
const encode = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// <w:t> matni, paragraf çegarasi yoki söz davom etmaydigan element (tab, uziliş, rasm, maydon).
const TOKEN =
  /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:t(\s[^>]*)?\/>|<\/?w:p(?=[\s>\/])[^>]*>|<w:(?:tab|br|cr|sym|drawing|pict|object|fldChar|instrText|footnoteReference|endnoteReference|commentReference|ptab)(?=[\s>\/])/g;

/** Bitta XML qismidagi matnni ögiradi; özgarmagan <w:t> lar tegilmaydi. */
export function convertWordXml(xml: string): { xml: string; stats: ConvertStats } {
  type Node = { start: number; end: number; attrs: string; text: string };
  const nodes: Node[] = [];
  const groups: (number | null)[][] = [];
  let group: (number | null)[] = [];
  const flush = () => {
    if (group.some((g) => g !== null)) groups.push(group);
    group = [];
  };
  for (const m of xml.matchAll(TOKEN)) {
    const tag = m[0];
    if (tag.startsWith("<w:t") && (tag[4] === ">" || tag[4] === " " || tag[4] === "/" || /\s/.test(tag[4]))) {
      nodes.push({ start: m.index!, end: m.index! + tag.length, attrs: m[1] ?? m[3] ?? "", text: m[2] !== undefined ? decode(m[2]) : "" });
      group.push(nodes.length - 1);
    } else if (/^<\/?w:p[\s>\/]/.test(tag)) {
      flush();
    } else {
      group.push(BREAK);
    }
  }
  flush();

  const total: ConvertStats = { changed: 0, cyrillic: 0, latin: 0 };
  const replaced = new Map<number, string>();
  for (const g of groups) {
    const { out, stats } = convertSegments(g.map((n) => (n === null ? BREAK : nodes[n].text)));
    total.changed += stats.changed;
    total.cyrillic += stats.cyrillic;
    total.latin += stats.latin;
    g.forEach((n, k) => {
      if (n !== null && out[k] !== nodes[n].text) replaced.set(n, out[k] as string);
    });
  }
  if (!replaced.size) return { xml, stats: total };

  let res = "";
  let last = 0;
  nodes.forEach((n, i) => {
    const text = replaced.get(i);
    if (text === undefined) return;
    // Boşi yoki oxirida böşliq qolsa, Word uni öçirmasligi uçun xml:space="preserve".
    let attrs = n.attrs;
    if (/^\s|\s$/.test(text) && !/xml:space=/.test(attrs)) attrs += ' xml:space="preserve"';
    res += xml.slice(last, n.start) + `<w:t${attrs}>${encode(text)}</w:t>`;
    last = n.end;
  });
  return { xml: res + xml.slice(last), stats: total };
}

const TEXT_PARTS = /^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/;
const MAX_PART = 64 * 1024 * 1024;

export type DocxResult = { buffer: Buffer; stats: ConvertStats };

/** Butun DOCX faylni ögiradi. Xato: not_docx, encrypted, unsupported. */
export function convertDocx(input: Buffer): DocxResult {
  if (input.length < 22 || input.readUInt32LE(0) !== 0x04034b50) throw new DocxError("not_docx");
  const entries = readZip(input);
  const names = entries.map((e) => e.name.toString("utf8"));
  if (!names.includes("word/document.xml")) throw new DocxError("not_docx");

  const total: ConvertStats = { changed: 0, cyrillic: 0, latin: 0 };
  const out = entries.map((e, i) => {
    if (!TEXT_PARTS.test(names[i])) return e;
    if (e.flags & 0x0001) throw new DocxError("encrypted");
    if (e.size > MAX_PART) throw new DocxError("unsupported");
    let raw: Buffer;
    if (e.method === 8) raw = inflateRawSync(e.data, { maxOutputLength: MAX_PART });
    else if (e.method === 0) raw = e.data;
    else throw new DocxError("unsupported");
    const xml = raw.toString("utf8");
    if (/^<\?xml[^>]*encoding="(?!utf-8)/i.test(xml)) return e;
    const r = convertWordXml(xml);
    total.changed += r.stats.changed;
    total.cyrillic += r.stats.cyrillic;
    total.latin += r.stats.latin;
    if (r.xml === xml) return e;
    const next = Buffer.from(r.xml, "utf8");
    const data = deflateRawSync(next, { level: 6 });
    return { ...e, method: 8, data, compSize: data.length, size: next.length, crc: crc32(next) };
  });
  return { buffer: writeZip(out), stats: total };
}
