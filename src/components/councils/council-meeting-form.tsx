"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconCalendarPlus as CalendarPlus } from "@tabler/icons-react";
import { createCouncilMeeting } from "@/server/actions/councils";

export function CouncilMeetingForm({ kind }: { kind: "ekspert" | "smeta" }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [scheduledAt, setScheduledAt] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!scheduledAt) { setError(t("kengash.meetingDate")); return; }
    start(async () => {
      try {
        await createCouncilMeeting({ kind, scheduledAt, title: title || null });
        setScheduledAt(""); setTitle("");
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[220px_1fr_auto] sm:items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]">{t("kengash.meetingDate")}</label>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]">{t("kengash.meetingTitle")}</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Button onClick={submit} disabled={pending}><CalendarPlus className="size-4" />{t("kengash.createMeeting")}</Button>
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
