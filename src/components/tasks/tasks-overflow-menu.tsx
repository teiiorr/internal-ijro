"use client";
import { useTranslations } from "next-intl";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { IconDots as MoreHorizontal, IconDownload as Download, IconChecklist as Checklist } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui-biib/Button";

const itemClass =
  "flex w-full cursor-pointer select-none items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-sm font-medium text-[var(--ink)] outline-none transition-colors data-[highlighted]:bg-[var(--surface-2)]";

/**
 * Vazifalar sarlavhasidagi ikkilamchi amallar: Excel eksport va Ijro nazoratiga oʻtish.
 * Ular sarlavhani band qilmasligi uchun bitta "⋯" menyuda.
 */
export function TasksOverflowMenu({ scope }: { scope: "mine" | "given" }) {
  const t = useTranslations();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="glass" size="40" icon={MoreHorizontal} iconOnly aria-label={t("common.actions")} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[210px] rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-2)]"
        >
          <DropdownMenu.Item asChild className={itemClass}>
            <a href={`/api/export/tasks?scope=${scope}`}>
              <Download className="size-4 text-[var(--ink-3)]" aria-hidden />
              Excel
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/tasks/control">
              <Checklist className="size-4 text-[var(--ink-3)]" aria-hidden />
              {t("staffX.taskControl.tabLabel")}
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
