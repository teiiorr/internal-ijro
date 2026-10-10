import {
  IconClipboardCheck,
  IconEye,
  IconFlag,
  IconListCheck,
  IconLock,
  IconMessageQuestion,
  IconUsersGroup,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

// Server va mijoz komponentlari uchun umumiy (hook'siz) yordamchilar.
// Bu yerda "server-only" modullar import qilinmaydi.

export type MyWorkKind = "task" | "approval" | "stage" | "review" | "studio_request" | "council" | "todo";

export const KIND_ICON: Record<MyWorkKind, TablerIcon> = {
  task: IconListCheck,
  approval: IconClipboardCheck,
  stage: IconFlag,
  review: IconEye,
  studio_request: IconMessageQuestion,
  council: IconUsersGroup,
  todo: IconLock,
};

/**
 * Tur yorligʻi — xotirjam, rangsiz: belgi + matn (--ink-3). Kapsula/rangli chip emas
 * (BIIB: tur oddiy metadata, qaror talab qilmaydi). Kindʼning rangi endi yoʻq.
 */
export function KindChip({ kind, label, className }: { kind: MyWorkKind; label: string; className?: string }) {
  const Icon = KIND_ICON[kind];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 t-micro text-[var(--ink-3)]", className)}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

/** "5-oktabr" — joriy yil boʻlsa yilsiz qisqa sana (YYYY-MM-DD kirish). */
export function shortDate(iso: string, locale: string, currentYear?: string): string {
  const full = formatDate(`${iso.slice(0, 10)}T12:00:00+05:00`, locale);
  if (currentYear && iso.startsWith(currentYear)) return full.replace(/\s\d{4}$/, "");
  return full;
}
