import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Heading } from "@/components/ui-biib/Heading";
import { Card } from "@/components/ui-biib/Card";
import { Button } from "@/components/ui-biib/Button";
import { requireUser } from "@/lib/session";
import { addDays, todayTashkent } from "@/lib/my-work/buckets";
import { cn } from "@/lib/utils";
import { getCalendarEvents, type CalendarEvent } from "@/server/queries/calendar";

type SP = Promise<Record<string, string | string[] | undefined>>;

// Hodisa turi → BIIB rangi: bosqich — info (koʻk), vazifa — tint (asosiy), majlis — warning (sariq).
const TYPE_COLOR: Record<CalendarEvent["type"], string> = {
  stage: "var(--info)",
  task: "var(--tint)",
  meeting: "var(--warning)",
};

// Ilova tili → Intl uchun BCP-47 yorligʻi (hafta/oy nomlari ish vaqtida olinadi).
const BCP47: Record<string, string> = {
  "uz-latn": "uz-Latn",
  oz: "uz-Latn",
  "uz-cyrl": "uz-Cyrl",
  ru: "ru",
};

// Oy oʻqlari — призрач (ghost) kvadrat boshqaruv (BackButton bilan bir uslub).
const ARROW_CLASS =
  "grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--ink-2)] transition-colors duration-[var(--dur-ui)] ease-[var(--ease-ui)] [@media(hover:hover)]:hover:bg-[var(--surface-2)] [@media(hover:hover)]:hover:text-[var(--ink)] active:scale-95";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
/** ISO sananing Dushanbadan boshlanuvchi hafta kuni: 0 = Dushanba … 6 = Yakshanba. */
const isoWeekdayMon = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;

export default async function CalendarPage({ searchParams }: { searchParams: SP }) {
  await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("calendar");
  const sp = await searchParams;
  const rawMonth = typeof sp.month === "string" ? sp.month : undefined;

  const currentMonth = todayTashkent().slice(0, 7);
  const month = rawMonth && MONTH_RE.test(rawMonth) ? rawMonth : currentMonth;
  const [year, monthIdx] = [Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1];
  const todayStr = todayTashkent();

  // Koʻrinadigan tur chegarasi: toʻliq haftalar (Dushanbadan), qoʻshni oylarning
  // oldingi/keyingi kunlarini ham qamrab oladi.
  const firstIso = `${month}-01`;
  const gridStart = addDays(firstIso, -isoWeekdayMon(firstIso));
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const lastIso = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const gridEnd = addDays(lastIso, 6 - isoWeekdayMon(lastIso));
  const totalDays =
    Math.round((Date.parse(`${gridEnd}T00:00:00Z`) - Date.parse(`${gridStart}T00:00:00Z`)) / 86_400_000) + 1;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));

  const events = await getCalendarEvents(gridStart, gridEnd);
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const arr = byDay.get(e.date);
    if (arr) arr.push(e);
    else byDay.set(e.date, [e]);
  }

  // Oldingi / keyingi oy (YYYY-MM).
  const ym = (y: number, m: number) => {
    const d = new Date(Date.UTC(y, m, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const prevMonth = ym(year, monthIdx - 1);
  const nextMonth = ym(year, monthIdx + 1);

  // Lokallashtirilgan hafta/oy nomlari — Intl orqali (xabarlar faylida saqlanmaydi).
  const bcp47 = BCP47[locale] ?? "uz-Latn";
  const monthName = new Intl.DateTimeFormat(bcp47, { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, monthIdx, 1)),
  );
  const monthTitle = `${cap(monthName)} ${year}`;
  const wdShort = new Intl.DateTimeFormat(bcp47, { weekday: "short", timeZone: "UTC" });
  const wdLong = new Intl.DateTimeFormat(bcp47, { weekday: "long", timeZone: "UTC" });
  // 2024-01-01 — Dushanba; shundan 7 ta hafta kuni sarlavhasi.
  const weekdayHeaders = Array.from({ length: 7 }, (_, i) =>
    cap(wdShort.format(new Date(Date.UTC(2024, 0, 1 + i)))),
  );

  // Mobil kun tartibi — faqat joriy oyning hodisali kunlari.
  const agendaDays = days.filter((d) => d.startsWith(month) && byDay.has(d));

  const MAX_CHIPS = 3;

  return (
    <div>
      <PageHeader title={t("title")} />

      <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
        {/* Oy navigatsiyasi */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading level={2}>{monthTitle}</Heading>
          <div className="flex items-center gap-1">
            {month !== currentMonth && (
              <Button asChild variant="ghost" size="40">
                <Link href="/calendar">{t("today")}</Link>
              </Button>
            )}
            <Link href={`/calendar?month=${prevMonth}`} aria-label={t("prevMonth")} className={ARROW_CLASS}>
              <IconChevronLeft className="size-5" />
            </Link>
            <Link href={`/calendar?month=${nextMonth}`} aria-label={t("nextMonth")} className={ARROW_CLASS}>
              <IconChevronRight className="size-5" />
            </Link>
          </div>
        </div>

        {/* Ish stoli: toʻliq tur */}
        <Card bare solid className="hidden overflow-hidden sm:block">
          <div className="grid grid-cols-7 border-b border-[var(--line)]">
            {weekdayHeaders.map((w, i) => (
              <div key={i} className="px-1 py-2.5 text-center t-micro font-medium text-[var(--ink-3)]">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-[var(--line)]">
            {days.map((d) => {
              const inMonth = d.startsWith(month);
              const isToday = d === todayStr;
              const list = byDay.get(d) ?? [];
              const shown = list.slice(0, MAX_CHIPS);
              const extra = list.length - shown.length;
              return (
                <div
                  key={d}
                  className={cn("min-h-[108px] p-1.5", inMonth ? "bg-[var(--surface)]" : "bg-[var(--surface-2)]")}
                >
                  <div className="mb-1 flex items-center justify-end">
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full text-xs tabular-nums",
                        isToday
                          ? "bg-[var(--tint)] font-semibold text-on-tint"
                          : inMonth
                            ? "text-[var(--ink-2)]"
                            : "text-[var(--ink-3)]",
                      )}
                    >
                      {Number(d.slice(8, 10))}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {shown.map((e, i) => (
                      <Link
                        key={`${e.href}-${i}`}
                        href={e.href}
                        title={e.subtitle ? `${e.title} — ${e.subtitle}` : e.title}
                        className="flex items-center gap-1 rounded-[var(--radius-s)] px-1.5 py-0.5 text-[11px] leading-tight text-[var(--ink)] transition-opacity [@media(hover:hover)]:hover:opacity-80"
                        style={{ backgroundColor: `color-mix(in oklab, ${TYPE_COLOR[e.type]} 16%, transparent)` }}
                      >
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: TYPE_COLOR[e.type] }}
                        />
                        <span className="truncate">{e.title}</span>
                      </Link>
                    ))}
                    {extra > 0 && <p className="px-1 t-micro text-[var(--ink-3)]">+{extra}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Mobil: hodisalar kun boʻyicha guruhlangan tartib */}
        <div className="sm:hidden">
          {agendaDays.length === 0 ? (
            <Card className="py-12 text-center t-small text-[var(--ink-3)]">{t("empty")}</Card>
          ) : (
            <div className="flex flex-col gap-5">
              {agendaDays.map((d) => (
                <div key={d}>
                  <div className="mb-2 flex items-baseline gap-2">
                    <span className="text-lg font-semibold tabular-nums text-[var(--ink)]">{Number(d.slice(8, 10))}</span>
                    <span className="t-small text-[var(--ink-2)]">{cap(wdLong.format(new Date(`${d}T00:00:00Z`)))}</span>
                    {d === todayStr && (
                      <span className="rounded-full bg-[var(--tint)] px-2 py-0.5 text-[11px] font-medium text-on-tint">
                        {t("today")}
                      </span>
                    )}
                  </div>
                  <Card bare solid className="divide-y divide-[var(--line)] overflow-hidden">
                    {byDay.get(d)!.map((e, i) => (
                      <Link
                        key={`${e.href}-${i}`}
                        href={e.href}
                        className="flex items-center gap-2.5 px-3 py-2.5 transition-colors [@media(hover:hover)]:hover:bg-[var(--surface-2)]"
                      >
                        <span
                          className="mt-1.5 size-2 shrink-0 self-start rounded-full"
                          style={{ backgroundColor: TYPE_COLOR[e.type] }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[var(--ink)]">{e.title}</span>
                          <span className="block truncate t-micro text-[var(--ink-3)]">
                            {e.subtitle ?? t(`type.${e.type}` as "type.stage")}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
