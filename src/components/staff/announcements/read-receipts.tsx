"use client";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconBellRinging, IconChevronDown, IconLoader2, IconCircleCheck } from "@tabler/icons-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { remindUnread } from "@/server/actions/announcements";
import { errorKey, percent } from "./logic";

type UnreadPerson = { id: string; fullName: string; avatarUrl: string | null; departmentName: string | null };

/**
 * Koʻrilganlik: progress-bar (foiz), hali koʻrmaganlarning ochiladigan ajratuvchi-qatorli
 * roʻyxati va "Qayta eslatish" (server 12 soatda bir martadan koʻp yubormaydi → too_soon toast).
 * "Koʻrildi X/Y" sarlavhasi tashqi `Section` meta'sida koʻrsatiladi — bu yerda takrorlanmaydi.
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
      <div className="flex items-center gap-4">
        <div
          role="progressbar"
          aria-label={t("seen", { read, total })}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={read}
          className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]"
        >
          <div
            className="h-full rounded-full bg-[var(--success)] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 t-small font-semibold tabular-nums text-[var(--ink-2)]">{pct}%</span>
      </div>

      {lastRemindedLabel && <p className="t-small text-[var(--ink-3)]">{t("lastReminded", { date: lastRemindedLabel })}</p>}

      {unread.length > 0 ? (
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="inline-flex min-w-0 items-center gap-1.5 py-1 text-left t-label text-[var(--ink)] transition-colors hover:text-[var(--tint)]"
            >
              <span className="min-w-0 truncate">
                {t("notSeen")} <span className="tabular-nums text-[var(--ink-3)]">({unread.length})</span>
              </span>
              <IconChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
            </button>
            {canRemind && (
              <Button variant="soft" size="sm" onClick={remind} disabled={pending}>
                {pending ? <IconLoader2 className="size-4 animate-spin" /> : <IconBellRinging className="size-4" />}
                {t("remindAgain")}
              </Button>
            )}
          </div>
          {open && (
            <ul className="divide-y divide-[var(--line)]">
              {unread.map((u) => {
                const name = localizeName(u.fullName, locale);
                return (
                  <li key={u.id} className="flex min-w-0 items-center gap-3 py-2.5">
                    <UserAvatar name={name} avatarUrl={u.avatarUrl} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{name}</p>
                      {u.departmentName && <p className="truncate t-small text-[var(--ink-3)]">{u.departmentName}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : total > 0 ? (
        <p className="flex items-center gap-1.5 t-small font-medium text-[var(--success)]">
          <IconCircleCheck className="size-4" aria-hidden />
          {t("allSeen")}
        </p>
      ) : null}
    </div>
  );
}
