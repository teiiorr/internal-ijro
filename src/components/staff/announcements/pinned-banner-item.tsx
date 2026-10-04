"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPinFilled, IconAlertTriangle, IconX, IconChevronRight } from "@tabler/icons-react";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { markAnnouncementRead } from "@/server/actions/announcements";

/** Dashboard'dagi bitta qadalgan eʼlon banneri. "×" — oʻqildi deb belgilaydi va yashiradi. */
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

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-2xl border px-2.5 py-2 sm:gap-3 sm:px-3.5",
        important
          ? "border-[var(--danger)]/30 bg-[var(--danger-soft)]"
          : "border-[var(--primary)]/25 bg-[var(--primary-soft)]"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-xl text-white",
          important ? "bg-[var(--danger)]" : "bg-[var(--primary)]"
        )}
      >
        {important ? <IconAlertTriangle className="size-4" /> : <IconPinFilled className="size-4" />}
      </span>
      <Link
        href={`/elonlar/${id}`}
        className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--foreground)] hover:underline"
        title={title}
      >
        {important && <span className="sr-only">{t("important")}: </span>}
        {title}
      </Link>
      <Link
        href={`/elonlar/${id}`}
        className={cn(
          "inline-flex shrink-0 items-center gap-0.5 text-sm font-bold hover:underline",
          important ? "text-[var(--danger)]" : "text-[var(--primary)]"
        )}
      >
        {t("read")}
        <IconChevronRight className="hidden size-4 sm:block" aria-hidden />
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        title={t("dismiss")}
        className="grid size-8 shrink-0 place-items-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--glass-fill-strong)] hover:text-[var(--foreground)]"
      >
        <IconX className="size-4" />
      </button>
    </div>
  );
}
