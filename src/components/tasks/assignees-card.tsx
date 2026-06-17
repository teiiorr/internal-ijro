"use client";
import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Search, BadgeCheck, ChevronDown, Clock4, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { reviewAssigneeResponse } from "@/server/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export type AssigneeItem = {
  userId: string;
  fullName: string;
  position: string | null;
  departmentName: string | null;
  status: "todo" | "in_progress" | "under_review" | "completed" | "rejected";
  responseText: string | null;
  responseFileUrl: string | null;
  responseFileName: string | null;
  responseSubmittedAt: Date | string | null;
  completedAt: Date | string | null;
  updatedAt: Date | string;
};

type Filter = "all" | "in_progress" | "completed";

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <div className="size-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-sm font-semibold text-[var(--primary)]">
      {initials}
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  todo: "bg-[var(--muted)]",
  in_progress: "bg-[var(--primary)]",
  under_review: "bg-[var(--warning)]",
  completed: "bg-[var(--success)]",
  rejected: "bg-[var(--danger)]",
};

export function AssigneesCard({
  taskId,
  currentUserId,
  isCreator,
  items,
}: {
  taskId: string;
  currentUserId: string;
  isCreator: boolean;
  items: AssigneeItem[];
}) {
  const t = useTranslations();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      if (term && !i.fullName.toLowerCase().includes(term) && !(i.departmentName ?? "").toLowerCase().includes(term)) return false;
      if (filter === "in_progress" && !["todo", "in_progress", "under_review", "rejected"].includes(i.status)) return false;
      if (filter === "completed" && i.status !== "completed") return false;
      return true;
    });
  }, [items, q, filter]);

  const fmt = (d: Date | string | null) =>
    d ? new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "—";

  async function review(userId: string, decision: "completed" | "rejected") {
    try {
      await reviewAssigneeResponse(taskId, userId, decision, feedback[userId]);
      toast.success(decision === "completed" ? t("tasks.review.approvedToast") : t("tasks.review.rejectedToast"));
    } catch (err) {
      toast.error(t("tasks.review.errorToast"), { description: (err as Error).message });
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-7 pt-6 pb-4 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-bold tracking-tight">{t("tasks.sections.people")}</h3>
        <span className="text-sm text-[var(--muted)] tabular">{items.length}</span>
      </div>

      <div className="px-7 pb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative md:max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--subtle)]" />
          <input
            placeholder={t("common.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-2)] pl-10 pr-3 text-[14px] placeholder:text-[var(--subtle)] focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_4px_var(--primary-soft)] transition-[border-color,box-shadow] duration-150"
          />
        </div>
        <div className="flex gap-1 ml-auto bg-[var(--surface-3)] rounded-[10px] p-1">
          {([
            ["all", t("common.all"), "text-[var(--foreground)]"],
            ["in_progress", t("status.in_progress"), "text-[var(--primary)]"],
            ["completed", t("status.completed"), "text-[var(--success)]"],
          ] as const).map(([k, label, color]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "px-4 py-1.5 rounded-[8px] text-sm font-semibold transition-all",
                filter === k
                  ? `bg-[var(--surface)] shadow-[var(--shadow-1)] ${color}`
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pb-5 space-y-1">
        {filtered.map((a) => {
          const isMe = a.userId === currentUserId;
          const isOpen = openId === a.userId;
          return (
            <div key={a.userId} className={cn(
              "rounded-xl transition-colors",
              isMe ? "bg-[var(--primary-soft)] ring-1 ring-inset ring-[var(--primary)]/15" : "hover:bg-[var(--surface-3)]"
            )}>
              <button
                onClick={() => setOpenId(isOpen ? null : a.userId)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <span className={cn("size-2 rounded-full shrink-0", STATUS_DOT[a.status])} />
                <Initials name={a.fullName} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[15px]">{a.fullName}</p>
                    {a.status === "completed" && <BadgeCheck className="size-[18px] text-[var(--success)]" />}
                  </div>
                  <p className="text-[13px] text-[var(--muted)] truncate">{a.departmentName ?? "—"}</p>
                </div>
                <div className="flex items-center gap-3 text-[var(--muted)]">
                  <div className="hidden sm:flex items-center gap-1.5 text-[13px] whitespace-nowrap tabular">
                    <Clock4 className="size-3.5" />
                    {fmt(a.updatedAt)}
                  </div>
                  <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-[var(--border)] mt-1 space-y-3">
                  {a.responseSubmittedAt ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-[var(--muted)]">{t("tasks.review.responseLabel")}</p>
                      <p className="text-[14px] whitespace-pre-wrap leading-relaxed">{a.responseText}</p>
                      {a.responseFileUrl && (
                        <a
                          href={a.responseFileUrl}
                          className="inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
                        >
                          <FileText className="size-4" />
                          {a.responseFileName ?? "Fayl"}
                        </a>
                      )}
                      <p className="text-[12px] text-[var(--muted)] tabular">{fmt(a.responseSubmittedAt)}</p>
                      {isCreator && a.status === "under_review" && (
                        <div className="pt-3 space-y-2 border-t border-[var(--border)]">
                          <Input
                            placeholder={t("tasks.review.feedbackPlaceholder")}
                            value={feedback[a.userId] ?? ""}
                            onChange={(e) => setFeedback((f) => ({ ...f, [a.userId]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => review(a.userId, "completed")}>{t("common.approve")}</Button>
                            <Button size="sm" variant="destructive" onClick={() => review(a.userId, "rejected")}>{t("common.reject")}</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <AlertCircle className="size-4" />
                      {t("tasks.review.noResponse")}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-[var(--muted)] py-10 text-sm">{t("common.noResults")}</p>
        )}
      </div>
    </Card>
  );
}
