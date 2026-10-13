"use client";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { shortName } from "@/lib/names";

export type CalendarLeaveItem = {
  id: string;
  userName: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
};

const STATUS_BG: Record<string, string> = {
  approved: "bg-[color-mix(in_oklab,var(--success)_20%,transparent)] text-[var(--ink)]",
  pending: "bg-[color-mix(in_oklab,var(--warning)_20%,transparent)] text-[var(--ink)]",
  rejected: "bg-[color-mix(in_oklab,var(--danger)_18%,transparent)] text-[var(--ink)]",
};

/** Bitta kun chipi — taqvim katagida ham, "+N" oynasida ham bir xil uslubda. */
export function DayChip({ item, className }: { item: CalendarLeaveItem; className?: string }) {
  const t = useTranslations();
  const typeLabel = t(`leaves.types.${item.type}` as "leaves.types.vacation");
  return (
    <div
      className={cn(
        "rounded-[var(--radius-s)] px-1.5 py-0.5 t-micro",
        STATUS_BG[item.status] ?? "bg-[var(--surface-3)] text-[var(--ink)]",
        className
      )}
    >
      {shortName(item.userName)}, {typeLabel}
    </div>
  );
}

/**
 * Desktopda "+N" bosilsa, kataqqa sigʻmagan kunlik hodisalar Radix Popover ichida
 * oʻsha uslubdagi chiplar sifatida koʻrinadi — shu bilan yashirin yozuvlar ham oching.
 * Ochiladigan panel chrome (overlay), shuning uchun BIIB oyna tokenlaridan foydalanamiz.
 */
export function CalendarDayOverflow({
  items,
  dayLabel,
}: {
  items: CalendarLeaveItem[];
  dayLabel: string;
}) {
  const t = useTranslations();
  if (items.length === 0) return null;
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        aria-label={`${t("nav.more")} (${items.length})`}
        className={cn(
          "w-full cursor-pointer rounded-[var(--radius-s)] px-1.5 py-0.5 text-left t-micro tabular-nums text-[var(--ink-3)]",
          "transition-colors duration-[var(--dur-ui)] ease-[var(--ease-ui)]",
          "hover:bg-[var(--surface-3)] hover:text-[var(--ink)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)]"
        )}
      >
        +{items.length}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            "z-50 flex w-[13rem] max-w-[80vw] flex-col gap-1 overflow-y-auto overscroll-contain p-2",
            "max-h-[min(20rem,var(--radix-popover-content-available-height))]",
            "rounded-[var(--radius-control)] border border-[var(--glass-border)] bg-[var(--glass-fill)]",
            "[-webkit-backdrop-filter:blur(var(--glass-blur))_saturate(var(--glass-saturate))] [backdrop-filter:blur(var(--glass-blur))_saturate(var(--glass-saturate))]",
            "text-[var(--ink)] [box-shadow:var(--inner-highlight),var(--shadow-2)]"
          )}
        >
          <div className="px-0.5 pb-1 t-micro tabular-nums text-[var(--ink-3)]">{dayLabel}</div>
          {items.map((it) => (
            <DayChip key={`${it.id}-overflow`} item={it} />
          ))}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
