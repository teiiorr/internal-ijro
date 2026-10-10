import { useTranslations } from "next-intl";
import { Status, type StatusTone } from "@/components/ui-biib/Status";

// Topshiriq holati → xotirjam BIIB holat belgisi (kapsula/signal-flag emas).
const STATUS_TONE: Record<string, StatusTone> = {
  todo: "neutral",
  in_progress: "info",
  under_review: "warning",
  completed: "success",
  rejected: "danger",
};

export function TaskStatusBadge({ status }: { status: string }) {
  const t = useTranslations();
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <Status tone={tone} dot>
      {t(`tasks.status.${status}` as `tasks.status.todo`)}
    </Status>
  );
}

// Ustuvorlik → rang: shoshilinch qizil, yuqori sariq, oʻrtacha/past — xotirjam matn.
const PRIORITY_TONE: Record<string, StatusTone> = {
  urgent: "danger",
  high: "warning",
  medium: "neutral",
  low: "neutral",
};

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const t = useTranslations();
  const tone = PRIORITY_TONE[priority] ?? "neutral";
  return <Status tone={tone}>{t(`tasks.priority.${priority}` as `tasks.priority.low`)}</Status>;
}
