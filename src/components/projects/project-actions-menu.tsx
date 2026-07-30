"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, Pencil, Pause, Play, PlayCircle, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { setProjectOnHold, setProjectInProgress, deleteProject } from "@/server/actions/projects";

type Project = React.ComponentProps<typeof EditProjectDialog>["project"];

const itemClass =
  "flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition-colors data-[highlighted]:bg-[var(--surface-2)]";

/**
 * One compact "⋯" menu for all project management actions, so the header stays
 * clean on both desktop and mobile instead of a stack of mismatched buttons.
 */
export function ProjectActionsMenu({
  project,
  curators,
  canManage,
  canDelete,
  showInProgress,
  onHold,
  inProgress,
}: {
  project: Project;
  curators: { id: string; fullName: string }[];
  canManage: boolean;
  canDelete: boolean;
  showInProgress: boolean;
  onHold: boolean;
  inProgress: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function togglePause() {
    start(() => setProjectOnHold(project.id, !onHold).catch(() => {}));
  }
  function toggleInProgress() {
    start(() => setProjectInProgress(project.id, !inProgress).catch(() => {}));
  }
  function onDelete() {
    start(async () => {
      try {
        await deleteProject(project.id);
        router.push("/projects");
        router.refresh();
      } catch {
        /* handled by revalidate/redirect */
      }
    });
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="outline" size="icon-sm" aria-label={t("common.actions")}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-[210px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-[var(--shadow-2)]"
          >
            {canManage && (
              <DropdownMenu.Item className={itemClass} onSelect={(e) => { e.preventDefault(); setEditOpen(true); }}>
                <Pencil className="size-4 text-[var(--muted)]" />
                {t("projects.edit.button")}
              </DropdownMenu.Item>
            )}
            {canManage && (
              <DropdownMenu.Item className={itemClass} onSelect={(e) => { e.preventDefault(); togglePause(); }}>
                {onHold ? <Play className="size-4 text-[var(--success)]" /> : <Pause className="size-4 text-[var(--warning)]" />}
                {onHold ? t("projects.resume") : t("projects.pause")}
              </DropdownMenu.Item>
            )}
            {showInProgress && (
              <DropdownMenu.Item className={itemClass} onSelect={(e) => { e.preventDefault(); toggleInProgress(); }}>
                {inProgress ? <RotateCcw className="size-4 text-[var(--muted)]" /> : <PlayCircle className="size-4 text-[var(--primary)]" />}
                {inProgress ? t("projects.clearInProgress") : t("projects.markInProgress")}
              </DropdownMenu.Item>
            )}
            {canDelete && (
              <>
                <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
                <DropdownMenu.Item
                  className={`${itemClass} text-[var(--danger)] data-[highlighted]:bg-[var(--danger-soft)]`}
                  onSelect={(e) => { e.preventDefault(); setConfirmOpen(true); }}
                >
                  <Trash2 className="size-4" />
                  {t("projects.delete.button")}
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Controlled edit dialog opened from the menu */}
      {canManage && <EditProjectDialog project={project} curators={curators} open={editOpen} onOpenChange={setEditOpen} />}

      {/* Delete confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("projects.delete.confirm")}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">{t("common.cancel")}</Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={onDelete} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {t("projects.delete.yes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
