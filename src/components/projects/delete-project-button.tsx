"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconTrash as Trash2, IconLoader2 as Loader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/server/actions/projects";

/** Two-step delete: a trash button that reveals an inline "are you sure?" confirm. */
export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onDelete() {
    setError(null);
    start(async () => {
      try {
        await deleteProject(projectId);
        router.push("/projects");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-4" />
        {t("projects.delete.button")}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-[var(--muted)]">{t("projects.delete.confirm")}</span>
      <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {t("projects.delete.yes")}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        {t("common.cancel")}
      </Button>
      {error && <span className="text-sm text-[var(--destructive)]">{error}</span>}
    </div>
  );
}
