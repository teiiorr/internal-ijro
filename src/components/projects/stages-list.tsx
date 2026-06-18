"use client";
import { useState, useTransition, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, CheckCircle2, GripVertical, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { overallProgress } from "@/lib/projects/progress";
import {
  createMilestone,
  setMilestoneProgress,
  updateMilestone,
  deleteMilestone,
  reorderMilestones,
} from "@/server/actions/projects";

type Stage = {
  id: string;
  title: string;
  weight: number;
  progress: number;
  orderIndex: number;
  deadline: string | null;
};

type Props = {
  projectId: string;
  items: Stage[];
  canManage: boolean;
  /** Bo'lim boshlig'i can edit but not delete — keep these split. */
  canDelete?: boolean;
};

export function StagesList({ projectId, items: initialItems, canManage, canDelete = canManage }: Props) {
  const t = useTranslations();
  const [stages, setStages] = useState<Stage[]>(
    [...initialItems].sort((a, b) => a.orderIndex - b.orderIndex)
  );
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();
  const newNameRef = useRef<HTMLInputElement>(null);

  const total = useMemo(() => overallProgress(stages), [stages]);

  function patch(id: string, partial: Partial<Stage>) {
    setStages((s) => s.map((x) => (x.id === id ? { ...x, ...partial } : x)));
  }

  function commitProgress(id: string, value: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    patch(id, { progress: clamped });
    startTransition(async () => {
      try {
        await setMilestoneProgress(id, clamped);
      } catch {
        // server will revalidate; on failure user sees server truth on next nav
      }
    });
  }

  function commitTitle(id: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(() => updateMilestone(id, { title: trimmed }).catch(() => {}));
  }

  function commitWeight(id: string, w: number) {
    const weight = Math.max(1, Math.round(w));
    patch(id, { weight });
    startTransition(() => updateMilestone(id, { weight }).catch(() => {}));
  }

  function remove(id: string) {
    setStages((s) => s.filter((x) => x.id !== id));
    startTransition(() => deleteMilestone(id).catch(() => {}));
  }

  function move(id: string, dir: -1 | 1) {
    const idx = stages.findIndex((x) => x.id === id);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= stages.length) return;
    const next = [...stages];
    [next[idx], next[target]] = [next[target], next[idx]];
    const ordered = next.map((x, i) => ({ ...x, orderIndex: i }));
    setStages(ordered);
    // Server reconciliation outside of the updater so React doesn't see
    // a Router update mid-render.
    startTransition(() =>
      reorderMilestones(projectId, ordered.map((x) => x.id)).catch(() => {})
    );
  }

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;
    startTransition(async () => {
      await createMilestone({
        projectId,
        title,
        orderIndex: stages.length,
        weight: 1,
      });
      setAdding(false);
      if (newNameRef.current) newNameRef.current.value = "";
    });
  }

  return (
    <div className="space-y-4">
      {/* Umumiy bajarilish */}
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold">{t("projects.stages.overall")}</h3>
          <span className="text-2xl font-bold tracking-tight tabular">{total}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
            style={{ width: `${total}%` }}
          />
        </div>
        <p className="text-xs text-[var(--muted)]">
          {stages.length === 0
            ? t("projects.stages.zeroCaption")
            : t("projects.stages.computedCaption", { count: stages.length })}
        </p>
      </div>

      {/* Stages list */}
      {stages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] p-6 text-center">
          <p className="text-sm text-[var(--muted)]">{t("projects.stages.empty")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {stages.map((s, idx) => (
            <li
              key={s.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 sm:p-4 space-y-3"
            >
              <div className="flex items-start gap-2">
                {canManage && (
                  <div className="flex flex-col gap-0.5 pt-1.5 shrink-0">
                    <button
                      onClick={() => move(s.id, -1)}
                      disabled={idx === 0}
                      aria-label={t("projects.stages.moveUp")}
                      className="text-[var(--subtle)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:hover:text-[var(--subtle)]"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <GripVertical className="size-3.5 text-[var(--subtle)]" />
                    <button
                      onClick={() => move(s.id, 1)}
                      disabled={idx === stages.length - 1}
                      aria-label={t("projects.stages.moveDown")}
                      className="text-[var(--subtle)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:hover:text-[var(--subtle)]"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[var(--subtle)] tabular w-5 text-right">{idx + 1}.</span>
                    {canManage ? (
                      <input
                        defaultValue={s.title}
                        onBlur={(e) => commitTitle(s.id, e.target.value)}
                        className="flex-1 min-w-0 bg-transparent border-0 px-0 text-[15px] font-semibold focus:outline-none focus:ring-0"
                      />
                    ) : (
                      <span className="flex-1 text-[15px] font-semibold">{s.title}</span>
                    )}
                    <span className="text-base font-bold tabular shrink-0">{s.progress}%</span>
                  </div>

                  {/* Slider + numeric input */}
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={s.progress}
                      disabled={!canManage}
                      onChange={(e) => patch(s.id, { progress: Number(e.target.value) })}
                      onMouseUp={(e) => commitProgress(s.id, Number((e.target as HTMLInputElement).value))}
                      onTouchEnd={(e) => commitProgress(s.id, Number((e.target as HTMLInputElement).value))}
                      onKeyUp={(e) => commitProgress(s.id, Number((e.target as HTMLInputElement).value))}
                      className={cn(
                        "flex-1 h-2 rounded-full bg-[var(--surface-3)] appearance-none touch-none",
                        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-5",
                        "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)]",
                        "[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[var(--shadow-2)]",
                        "[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full",
                        "[&::-moz-range-thumb]:bg-[var(--primary)] [&::-moz-range-thumb]:border-0",
                        "disabled:opacity-50"
                      )}
                    />
                    {canManage && (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={s.progress}
                        onChange={(e) => patch(s.id, { progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                        onBlur={(e) => commitProgress(s.id, Number(e.target.value))}
                        className="w-16 h-8 rounded-md border border-[var(--input)] bg-[var(--surface)] px-2 text-sm font-semibold text-center tabular"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {canManage && (
                      <label className="inline-flex items-center gap-1.5 text-[var(--muted)]">
                        <span>{t("projects.stages.weight")}:</span>
                        <input
                          type="number"
                          min={1}
                          defaultValue={s.weight}
                          onBlur={(e) => commitWeight(s.id, Number(e.target.value))}
                          className="w-12 h-7 rounded-md border border-[var(--input)] bg-[var(--surface)] px-2 text-xs font-semibold text-center tabular"
                        />
                      </label>
                    )}
                    {!canManage && <span className="text-[var(--muted)]">{t("projects.stages.weight")}: {s.weight}</span>}

                    {canManage && (
                      <div className="ml-auto flex items-center gap-1">
                        {s.progress < 100 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => commitProgress(s.id, 100)}
                          >
                            <CheckCircle2 className="size-3.5" /> {t("projects.stages.markDone")}
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(s.id)}
                            className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                            aria-label={t("common.delete")}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        adding ? (
          <form
            onSubmit={add}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="stage-title">{t("projects.stages.newTitle")}</Label>
              <Input ref={newNameRef} id="stage-title" name="title" required placeholder={t("projects.stages.newPlaceholder")} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                {t("projects.stages.addBtn")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> {t("projects.stages.addBtn")}
          </Button>
        )
      )}
    </div>
  );
}
