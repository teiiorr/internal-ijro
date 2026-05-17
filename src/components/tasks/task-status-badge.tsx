import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

const VARIANTS = {
  todo: "secondary",
  in_progress: "default",
  under_review: "warning",
  completed: "success",
  rejected: "danger",
} as const;

export function TaskStatusBadge({ status }: { status: string }) {
  const t = useTranslations();
  return (
    <Badge variant={(VARIANTS[status as keyof typeof VARIANTS] ?? "secondary") as "default" | "secondary" | "warning" | "success" | "danger"}>
      {t(`tasks.status.${status}` as `tasks.status.todo`)}
    </Badge>
  );
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const t = useTranslations();
  const v = priority === "urgent" ? "danger" : priority === "high" ? "warning" : priority === "low" ? "secondary" : "default";
  return <Badge variant={v}>{t(`tasks.priority.${priority}` as `tasks.priority.low`)}</Badge>;
}
