"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight } from "@tabler/icons-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const hrefFor = (week: string) => `/reports/weekly?week=${week}`;

/**
 * Hafta tanlagich: ← / → strelkalar va oxirgi 12 ta tugagan haftaning roʻyxati
 * ("2026-W40 (28.09–04.10)"). Keyingi hafta hali tugamagan boʻlsa → tugmasi oʻchiq.
 */
export function WeekPicker({
  week,
  options,
  prevWeek,
  nextWeek,
}: {
  week: string;
  options: { value: string; label: string }[];
  prevWeek: string | null;
  nextWeek: string | null;
}) {
  const t = useTranslations("staffX.weeklyBrief");
  const router = useRouter();
  const [pending, start] = useTransition();

  const go = (w: string) => {
    if (w === week) return;
    start(() => router.push(hrefFor(w)));
  };

  const arrow = (target: string | null, label: string, icon: React.ReactNode) =>
    target ? (
      <Button asChild variant="outline" size="icon" className="shrink-0">
        <Link href={hrefFor(target)} aria-label={label} title={label}>
          {icon}
        </Link>
      </Button>
    ) : (
      <Button variant="outline" size="icon" className="shrink-0" disabled aria-label={label} title={label}>
        {icon}
      </Button>
    );

  return (
    <div className={cn("flex w-full min-w-0 items-center gap-2 sm:w-auto", pending && "opacity-70")} aria-busy={pending}>
      {arrow(prevWeek, t("prevWeek"), <ChevronLeft className="size-5" />)}
      <Select value={week} onValueChange={go}>
        <SelectTrigger className="min-w-0 flex-1 tabular-nums sm:w-[250px] sm:flex-none" aria-label={t("week")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="tabular-nums">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {arrow(nextWeek, t("nextWeek"), <ChevronRight className="size-5" />)}
    </div>
  );
}
