"use client";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { StatusTag } from "@/components/ui/status-tag";

type Props = {
  deadline: Date | string | null | undefined;
  completed?: boolean;
  className?: string;
};

const LABELS: Record<string, { day: string; hour: string; min: string; sec: string; overdue: string }> = {
  "uz-latn": { day: "kun", hour: "soat", min: "minut", sec: "son.", overdue: "Kechikdi" },
  "uz-cyrl": { day: "кун", hour: "соат", min: "минут", sec: "сон.", overdue: "Кечикди" },
  ru: { day: "дн.", hour: "ч.", min: "мин.", sec: "сек.", overdue: "Просрочено" },
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function tickInterval(diffMs: number): number {
  if (diffMs <= 0) return 0;
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3_600);
  if (days > 0) return 60_000;
  if (hours > 0) return 30_000;
  return 1_000;
}

export function DeadlineCountdown({ deadline, completed = false, className }: Props) {
  const locale = useLocale();
  const [now, setNow] = useState<number>(() => Date.now());

  const target = deadline ? new Date(deadline).getTime() : NaN;
  const diffMs = Number.isNaN(target) ? 0 : target - now;
  const interval = tickInterval(diffMs);

  useEffect(() => {
    if (!interval) return;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);

  if (!deadline || completed) return null;
  if (Number.isNaN(target)) return null;

  const l = LABELS[locale] ?? LABELS["uz-latn"];

  if (diffMs <= 0) {
    return (
      <StatusTag tone="red" className={cn("tabular-nums", className)}>
        {l.overdue}
      </StatusTag>
    );
  }

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3_600);
  const mins = Math.floor((totalSec % 3_600) / 60);
  const secs = totalSec % 60;

  const urgent = days === 0 && hours < 6;
  const soon = days < 3;
  const tone = urgent ? "red" : soon ? "amber" : "green";

  let text: string;
  if (days > 0) {
    text = `${days} ${l.day}`;
  } else if (hours > 0) {
    text = `${hours} ${l.hour} ${mins} ${l.min}`;
  } else if (mins > 0) {
    text = `${pad(mins)}:${pad(secs)}`;
  } else {
    text = `${secs} ${l.sec}`;
  }

  return (
    <StatusTag tone={tone} className={cn("tabular-nums", className)}>
      {text}
    </StatusTag>
  );
}
