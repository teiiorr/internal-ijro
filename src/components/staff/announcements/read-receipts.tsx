"use client";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconEye, IconBellRinging, IconChevronDown, IconLoader2, IconCircleCheck } from "@tabler/icons-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { remindUnread } from "@/server/actions/announcements";
import { errorKey, percent } from "./logic";

type UnreadPerson = { id: string; fullName: string; avatarUrl: string | null; departmentName: string | null };

/**
 * "Koʻrildi X/Y" progress-bar, hali koʻrmaganlarning ochiladigan roʻyxati va
 * "Qayta eslatish" (server 12 soatda bir martadan koʻp yubormaydi → too_soon toast).
 */
export function ReadReceipts({
  announcementId,
  read,
  total,
  unread,
  lastRemindedLabel,
  canRemind = true,
}: {
  announcementId: string;
  read: number;
  total: number;
  unread: UnreadPerson[];
  /** Oxirgi eslatma vaqti (serverda formatlangan) yoki null. */
  lastRemindedLabel?: string | null;
  canRemind?: boolean;
}) {
  const t = useTranslations("staffX.announcements");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const pct = percent(read, total);

  function remind() {
    start(async () => {
      try {
        const res = await remindUnread(announcementId);
        if (!res.ok) {
          toast.error(t(errorKey(res.error)));
          return;
        }
        toast.success(t("remindSent", { count: res.sent }));
        router.refresh();
      } catch {
        toast.error(t("errors.generic"));
      }
    });
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            <IconEye className="size-4" aria-hidden />
            {t("receiptsTitle")}
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {t("seen", { read, total })}
            <span className="ml-2 text-sm font-semibold text-[var(--muted)]">{pct}%</span>
          </p>
        </div>
        {canRemind && unread.length > 0 && (
          <Button variant="soft" size="sm" onClick={remind} disabled={pending} className="w-full sm:w-auto">
            {pending ? <IconLoader2 className="size-4 animate-spin" /> : <IconBellRinging className="size-4" />}
            {t("remindAgain")}
          </Button>
        )}
      </div>

      <div
        role="progressbar"
        aria-label={t("seen", { read, total })}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={read}
        className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]"
      >
        <div className="h-full rounded-full bg-[var(--success)] transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>

      {lastRemindedLabel && <p className="text-xs text-[var(--muted)]">{t("lastReminded", { date: lastRemindedLabel })}</p>}

      {unread.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-2 rounded-xl py-1.5 text-left text-sm font-semibold transition-colors hover:text-[var(--primary)]"
          >
            <span className="min-w-0 truncate">
              {t("notSeen")} <span className="tabular-nums text-[var(--muted)]">({unread.length})</span>
            </span>
            <IconChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
          </button>
          {open && (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {unread.map((u) => {
                const name = localizeName(u.fullName, locale);
                return (
                  <li key={u.id} className="flex min-w-0 items-center gap-2.5 rounded-xl bg-[var(--surface-2)] px-2.5 py-2">
                    <UserAvatar name={name} avatarUrl={u.avatarUrl} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{name}</p>
                      {u.departmentName && <p className="truncate text-xs text-[var(--muted)]">{u.departmentName}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : total > 0 ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--success)]">
          <IconCircleCheck className="size-4" aria-hidden />
          {t("allSeen")}
        </p>
      ) : null}
    </div>
  );
}
