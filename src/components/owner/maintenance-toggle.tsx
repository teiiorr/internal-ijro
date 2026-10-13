"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconAlertTriangle } from "@tabler/icons-react";
import { setMaintenanceMode } from "@/server/actions/maintenance";
import { cn } from "@/lib/utils";

/** Texnik rejim tumbleri — faqat Egasi panelida. Yoqilsa, egadan boshqa hamma
 *  texnik sahifaga yoʻnaltiriladi; ega oʻzgarishlarni oldindan koʻra oladi. */
export function MaintenanceToggle({ initialOn }: { initialOn: boolean }) {
  const t = useTranslations("owner.maintenance");
  const router = useRouter();
  const [on, setOn] = useState(initialOn);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !on;
    if (next && !window.confirm(t("confirmOn"))) return;
    setOn(next);
    start(async () => {
      try {
        await setMaintenanceMode(next);
        toast.success(next ? t("turnedOn") : t("turnedOff"));
        router.refresh();
      } catch {
        setOn(!next);
        toast.error(t("error"));
      }
    });
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--ink)]">{t("label")}</p>
        <p className="mt-0.5 t-small text-[var(--ink-2)]">{on ? t("onHint") : t("offHint")}</p>
        {on && (
          <p className="mt-2 inline-flex items-center gap-1.5 t-small font-medium text-[var(--warning)]">
            <IconAlertTriangle className="size-4" aria-hidden />
            {t("activeWarning")}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t("label")}
        onClick={toggle}
        disabled={pending}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
          on ? "bg-[var(--danger)]" : "bg-[var(--surface-3)]",
        )}
      >
        <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}
