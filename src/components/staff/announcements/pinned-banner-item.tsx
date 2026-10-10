"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPinFilled, IconAlertTriangle, IconX } from "@tabler/icons-react";
import { Link, useRouter } from "@/i18n/navigation";
import { markAnnouncementRead } from "@/server/actions/announcements";

/**
 * Dashboard'dagi bitta qadalgan eʼlon qatori (ajratuvchi roʻyxat ichida, quti emas).
 * Yetakchi belgi holatni bildiradi (muhim → ogohlantirish), sarlavha — havola,
 * "×" — oʻqildi deb belgilaydi va yashiradi.
 */
export function PinnedBannerItem({ id, title, important }: { id: string; title: string; important: boolean }) {
  const t = useTranslations("staffX.announcements");
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [, start] = useTransition();

  if (hidden) return null;

  function dismiss() {
    setHidden(true);
    start(async () => {
      try {
        const res = await markAnnouncementRead(id);
        if (!res.ok) throw new Error(res.error);
        router.refresh();
      } catch {
        setHidden(false);
        toast.error(t("errors.generic"));
      }
    });
  }

  const Icon = important ? IconAlertTriangle : IconPinFilled;

  return (
    <li className="-mx-5 flex min-w-0 items-center gap-3 px-5 sm:-mx-6 sm:px-6">
      <Icon
        className={important ? "size-4 shrink-0 text-[var(--danger)]" : "size-4 shrink-0 text-[var(--tint)]"}
        aria-hidden
      />
      <Link
        href={`/elonlar/${id}`}
        className="min-w-0 flex-1 truncate py-3 text-[0.9375rem] font-medium text-[var(--ink)] transition-colors hover:text-[var(--tint)]"
        title={title}
      >
        {important && <span className="sr-only">{t("important")}: </span>}
        {title}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        title={t("dismiss")}
        className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
      >
        <IconX className="size-4" aria-hidden />
      </button>
    </li>
  );
}
