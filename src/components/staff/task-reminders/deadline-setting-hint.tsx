import { useTranslations } from "next-intl";

/**
 * One-line explanation under the "notify_task_deadline" toggle in settings.
 * Works inside both server and client components (no server-only imports).
 */
export function TaskDeadlineSettingHint({ className }: { className?: string }) {
  const t = useTranslations("staffX.taskReminders");
  return (
    <span className={`mt-0.5 block break-words t-micro font-normal leading-snug text-[var(--ink-3)] ${className ?? ""}`}>
      {t("settingsHint")}
    </span>
  );
}
