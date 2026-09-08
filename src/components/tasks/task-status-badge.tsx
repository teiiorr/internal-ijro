import { useTranslations } from "next-intl";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";

// Topşiriq holati → svetofor rangi (çiziqli teg, töldirilgan çip emas).
const STATUS_TONE: Record<string, StatusTone> = {
  todo: "muted",
  in_progress: "amber",
  under_review: "amber",
  completed: "green",
  rejected: "red",
};

export function TaskStatusBadge({ status }: { status: string }) {
  const t = useTranslations();
  return <StatusTag tone={STATUS_TONE[status] ?? "muted"}>{t(`tasks.status.${status}` as `tasks.status.todo`)}</StatusTag>;
}

// Ustuvorlik → rang: şoşilinç qizil, yuqori/örta sariq, past xira.
const PRIORITY_TONE: Record<string, StatusTone> = {
  urgent: "red",
  high: "amber",
  medium: "amber",
  low: "muted",
};

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const t = useTranslations();
  return <StatusTag tone={PRIORITY_TONE[priority] ?? "muted"}>{t(`tasks.priority.${priority}` as `tasks.priority.low`)}</StatusTag>;
}
