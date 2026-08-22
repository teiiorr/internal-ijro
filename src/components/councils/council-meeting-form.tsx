"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconCalendarPlus as CalendarPlus, IconClockPlus as ClockPlus, IconX as X } from "@tabler/icons-react";
import { createCouncilMeeting } from "@/server/actions/councils";

export function CouncilMeetingForm({ kind }: { kind: "ekspert" | "smeta" }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [showTime, setShowTime] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!date) { setError(t("kengash.meetingDateRequired")); return; }
    start(async () => {
      try {
        await createCouncilMeeting({ kind, date, time: showTime ? time || null : null, title: title || null });
        setDate(""); setTime(""); setShowTime(false); setTitle("");
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]">{t("kengash.meetingDate")}</label>
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[150px] shrink-0 px-3"
            />
            {showTime ? (
              <>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-[110px] shrink-0 px-3"
                />
                <button
                  type="button"
                  onClick={() => { setShowTime(false); setTime(""); }}
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] active:scale-95"
                  aria-label={t("common.delete")}
                >
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowTime(true)}
                className="inline-flex h-11 shrink-0 items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)] active:scale-95"
              >
                <ClockPlus className="size-4" />{t("kengash.addTime")}
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]">{t("kengash.meetingTitle")}</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Button onClick={submit} disabled={pending} className="w-full sm:w-auto"><CalendarPlus className="size-4" />{t("kengash.createMeeting")}</Button>
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
