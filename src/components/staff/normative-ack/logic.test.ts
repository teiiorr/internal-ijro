import { describe, expect, it } from "vitest";
import {
  DEFAULT_REGISTRY_FILTER,
  ackPercent,
  addDaysYmd,
  canEditDocMeta,
  canManageAckRequest,
  canSendAck,
  chunk,
  daysBetweenYmd,
  deadlineLabel,
  docYear,
  errorKey,
  filterRegistry,
  formatTashkentDateTime,
  isFilterActive,
  isYmd,
  normalizeSearch,
  registryYears,
  remindTooSoon,
  tashkentYmd,
  ymdToDots,
  type DocMeta,
  type FilterableDoc,
} from "./logic";

const meta = (m: Partial<DocMeta>): DocMeta => ({
  docType: null,
  docNumber: null,
  docDate: null,
  issuedBy: null,
  status: "active",
  supersededById: null,
  summary: null,
  ...m,
});

const DOCS: (FilterableDoc & { id: string })[] = [
  {
    id: "a",
    fileName: "Ichki mehnat tartibi qoidalari.pdf",
    uploadedAt: "2025-03-10T08:00:00Z",
    meta: meta({ docType: "buyruq", docNumber: "45", docDate: "2026-10-01", issuedBy: "Direktor", summary: "Ish vaqti va dam olish tartibi" }),
  },
  {
    id: "b",
    fileName: "Eski nizom.docx",
    uploadedAt: "2024-01-05T08:00:00Z",
    meta: meta({ docType: "nizom", docNumber: "12", docDate: "2024-01-01", status: "repealed", supersededById: "c" }),
  },
  { id: "c", fileName: "Yangi nizom.docx", uploadedAt: "2026-02-01T08:00:00Z", meta: meta({ docType: "nizom", docNumber: "7" }) },
  { id: "d", fileName: "Oʻzbekiston Respublikasi qonuni.pdf", uploadedAt: "2023-12-31T20:00:00Z", meta: null },
];

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("registry filters", () => {
  it("default filter keeps every document (same array)", () => {
    expect(isFilterActive(DEFAULT_REGISTRY_FILTER)).toBe(false);
    expect(filterRegistry(DOCS, DEFAULT_REGISTRY_FILTER)).toBe(DOCS);
  });

  it("searching '45' finds the document by its number (also with №)", () => {
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, q: "45" }))).toEqual(["a"]);
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, q: "№ 45" }))).toEqual(["a"]);
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, q: "№45" }))).toEqual(["a"]);
  });

  it("searches name, summary and issuing body, all terms must match", () => {
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, q: "dam olish" }))).toEqual(["a"]);
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, q: "NIZOM" }))).toEqual(["b", "c"]);
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, q: "yangi nizom" }))).toEqual(["c"]);
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, q: "direktor" }))).toEqual(["a"]);
  });

  it("treats the apostrophe family as equal (Oʻz / O'z / O‘z)", () => {
    expect(normalizeSearch("Oʻzbekiston")).toBe(normalizeSearch("O'zbekiston"));
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, q: "o'zbekiston" }))).toEqual(["d"]);
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, q: "O‘zbekiston" }))).toEqual(["d"]);
  });

  it("filters by type and status (no meta = active)", () => {
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, type: "nizom" }))).toEqual(["b", "c"]);
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, status: "repealed" }))).toEqual(["b"]);
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, status: "active" }))).toEqual(["a", "c", "d"]);
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, type: "nizom", status: "active" }))).toEqual(["c"]);
  });

  it("year = document date year, else the Tashkent upload year", () => {
    expect(docYear(DOCS[0])).toBe(2026); // doc_date wins over upload year 2025
    expect(docYear(DOCS[2])).toBe(2026);
    // 2023-12-31 20:00 UTC is already 2024-01-01 in Tashkent
    expect(docYear(DOCS[3])).toBe(2024);
    expect(registryYears(DOCS)).toEqual([2026, 2024]);
    expect(ids(filterRegistry(DOCS, { ...DEFAULT_REGISTRY_FILTER, year: 2024 }))).toEqual(["b", "d"]);
  });
});

describe("RBAC helpers", () => {
  it("rekvizitlar: uploader, direktor, orinbosar, hr", () => {
    expect(canEditDocMeta({ id: "u1", position: "mutaxassis" }, "u1")).toBe(true);
    expect(canEditDocMeta({ id: "u1", position: "mutaxassis" }, "u2")).toBe(false);
    expect(canEditDocMeta({ id: "u1", position: "mutaxassis" }, null)).toBe(false);
    expect(canEditDocMeta({ id: "u9", position: "hr" }, "u2")).toBe(true);
    expect(canEditDocMeta({ id: "u9", position: "orinbosar" }, null)).toBe(true);
    expect(canEditDocMeta({ id: "u9", position: "bolim_boshligi" }, "u2")).toBe(false);
    expect(canEditDocMeta({ id: "u1", position: "kontragent" }, "u1")).toBe(false);
    expect(canEditDocMeta({}, "u1")).toBe(false);
  });

  it("progress / remind / PDF: requester, direktor, orinbosar, hr", () => {
    expect(canManageAckRequest({ id: "u1", position: "bolim_boshligi" }, "u1")).toBe(true);
    expect(canManageAckRequest({ id: "u1", position: "bolim_boshligi" }, "u2")).toBe(false);
    expect(canManageAckRequest({ id: "u3", position: "direktor" }, "u2")).toBe(true);
    expect(canManageAckRequest({ id: "u3", position: "mutaxassis" }, null)).toBe(false);
  });

  it("senders", () => {
    for (const p of ["direktor", "orinbosar", "hr", "bolim_boshligi", "koordinator"]) expect(canSendAck(p)).toBe(true);
    for (const p of ["mutaxassis", "bosh_mutaxassis", "yetakchi_mutaxassis", "kontragent", null]) expect(canSendAck(p)).toBe(false);
  });

  it("manual reminder throttle is 12h", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    expect(remindTooSoon(null, now)).toBe(false);
    expect(remindTooSoon(new Date("2026-10-05T01:00:00Z"), now)).toBe(true); // 11h ago
    expect(remindTooSoon("2026-10-05T00:00:00Z", now)).toBe(false); // exactly 12h ago
    expect(remindTooSoon("2026-10-04T23:00:00Z", now)).toBe(false);
  });
});

describe("dates (Tashkent)", () => {
  it("tashkentYmd crosses midnight at 19:00 UTC", () => {
    expect(tashkentYmd(new Date("2026-10-05T18:59:00Z"))).toBe("2026-10-05");
    expect(tashkentYmd(new Date("2026-10-05T19:00:00Z"))).toBe("2026-10-06");
  });

  it("validates and shifts calendar dates", () => {
    expect(isYmd("2026-10-01")).toBe(true);
    expect(isYmd("2026-02-31")).toBe(false);
    expect(isYmd("01.10.2026")).toBe(false);
    expect(isYmd(null)).toBe(false);
    expect(addDaysYmd("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysYmd("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetweenYmd("2026-10-05", "2026-10-08")).toBe(3);
    expect(daysBetweenYmd("2026-10-05", "2026-10-01")).toBe(-4);
  });

  it("formats dd.mm.yyyy and dd.mm.yyyy HH:mm", () => {
    expect(ymdToDots("2026-10-01")).toBe("01.10.2026");
    expect(ymdToDots(null)).toBe("");
    expect(formatTashkentDateTime(new Date("2026-10-01T04:05:00Z"))).toBe("01.10.2026 09:05");
    expect(formatTashkentDateTime("2026-12-31T20:30:00Z")).toBe("01.01.2027 01:30");
    expect(formatTashkentDateTime(null)).toBe("");
  });

  it("deadline countdown chip", () => {
    expect(deadlineLabel(-2)).toEqual({ key: "overdueDays", count: 2, tone: "red" });
    expect(deadlineLabel(0)).toEqual({ key: "dueToday", count: 0, tone: "red" });
    expect(deadlineLabel(1)).toEqual({ key: "dueTomorrow", count: 1, tone: "amber" });
    expect(deadlineLabel(3)).toEqual({ key: "daysLeft", count: 3, tone: "amber" });
    expect(deadlineLabel(10)).toEqual({ key: "daysLeft", count: 10, tone: "muted" });
  });
});

describe("misc", () => {
  it("maps error codes to i18n keys", () => {
    expect(errorKey("forbidden_audience")).toBe("forbiddenAudience");
    expect(errorKey("empty_audience")).toBe("emptyAudience");
    expect(errorKey("too_soon")).toBe("tooSoon");
    expect(errorKey("open_first")).toBe("openFirst");
    expect(errorKey("not_ready")).toBe("errors.notReady");
    expect(errorKey("whatever")).toBe("errors.generic");
    expect(errorKey(undefined)).toBe("errors.generic");
  });

  it("progress percent and chunking", () => {
    expect(ackPercent(3, 4)).toBe(75);
    expect(ackPercent(0, 0)).toBe(0);
    expect(ackPercent(5, 4)).toBe(100);
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});
