"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  deadline: Date | string | null | undefined;
  completed?: boolean;
  className?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Live countdown chip with verbose Uzbek units that collapse as time runs out:
 *   23 kun 4 soat 12 minut    — many days remain
 *   4 soat 12 minut           — under a day (kun dropped)
 *   12:45                     — under an hour (now ticking by second)
 *   45 son.                   — under a minute
 *   Kechikti                  — deadline passed
 *
 * The component re-renders every second so the seconds tick visibly when it
 * matters (last hour) without thrashing render the rest of the time —
 * setInterval is a 1Hz tick either way; React skips no-op renders cheaply.
 */
export function DeadlineCountdown({ deadline, completed = false, className }: Props) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!deadline || completed) return null;

  const target = new Date(deadline).getTime();
  if (Number.isNaN(target)) return null;

  const diffMs = target - now;

  if (diffMs <= 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center h-6 px-2.5 rounded-[6px] text-[11.5px] font-bold leading-none whitespace-nowrap bg-[var(--danger)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
          className
        )}
      >
        Kechikti
      </span>
    );
  }

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3_600);
  const mins = Math.floor((totalSec % 3_600) / 60);
  const secs = totalSec % 60;

  // Tone: red if < 6h, amber if < 3 days, primary otherwise
  const urgent = days === 0 && hours < 6;
  const soon = days < 3;

  const toneClass = urgent
    ? "bg-[var(--danger)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
    : soon
      ? "bg-[var(--warning)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
      : "bg-[var(--primary)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]";

  let text: string;
  if (days > 0) {
    // "23 kun 4 soat 12 minut"
    text = `${days} kun ${hours} soat ${mins} minut`;
  } else if (hours > 0) {
    // "4 soat 12 minut" — kun dropped
    text = `${hours} soat ${mins} minut`;
  } else if (mins > 0) {
    // "12:45" — last hour, real-time MM:SS ticker
    text = `${pad(mins)}:${pad(secs)}`;
  } else {
    // "45 son." — last minute, count seconds
    text = `${secs} son.`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center h-6 px-2.5 rounded-[6px] text-[11.5px] font-bold leading-none whitespace-nowrap tabular",
        toneClass,
        className
      )}
    >
      {text}
    </span>
  );
}
