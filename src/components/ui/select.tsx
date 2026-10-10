"use client";
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { IconCheck as Check, IconSelector as ChevronsUpDown, IconChevronUp as ChevronUp, IconChevronDown as ChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectGroup = SelectPrimitive.Group;

/**
 * Trigger input kabi: qattiq `--surface-2`, 1px `--line-strong`, radius 12, 48px, oynasiz.
 * Ochiladigan kontent — chrome (overlay), shuning uchun oyna ruxsat etilgan: BIIB oyna
 * tokenlari, radius 12, ichki yoritish + floating soya (qoʻlbola rgba emas).
 */
export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // min-w-0 va quyidagi truncate örami uzun, bir qatorli qiymatlarning
      // tor ekranlarda boshqaruvni ikki qatorga tushirib yuborishining oldini oladi.
      "flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--line-strong)] " +
      "bg-[var(--surface-2)] pl-4 pr-4 text-[16px] font-medium text-[var(--ink)] whitespace-nowrap " +
      "transition-[border-color] duration-[var(--dur-ui)] ease-[var(--ease-ui)] " +
      "data-[placeholder]:text-[var(--ink-3)] " +
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-3)]",
      className
    )}
    {...props}
  >
    <span className="min-w-0 flex-1 truncate text-left">{children}</span>
    <SelectPrimitive.Icon asChild>
      <ChevronsUpDown className="size-[18px] text-[var(--ink-3)] shrink-0" strokeWidth={2} />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        "relative z-50 min-w-[10rem] overflow-hidden rounded-[var(--radius-control)] " +
        "border border-[var(--glass-border)] bg-[var(--glass-fill)] " +
        "[-webkit-backdrop-filter:blur(var(--glass-blur))_saturate(var(--glass-saturate))] [backdrop-filter:blur(var(--glass-blur))_saturate(var(--glass-saturate))] " +
        "text-[var(--ink)] [box-shadow:var(--inner-highlight),var(--shadow-2)]",
        position === "popper" && "data-[side=bottom]:translate-y-1",
        className
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1.5",
          // Uzun ro'yxatlar ekrandan chiqib ketmasligi uchun suriladigan bo'lishi kerak.
          "max-h-[min(20rem,var(--radix-select-content-available-height))] overflow-y-auto overscroll-contain",
          position === "popper" &&
            "w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

const scrollBtn =
  "flex cursor-default items-center justify-center py-1 text-[var(--ink-3)]";

export const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton ref={ref} className={cn(scrollBtn, className)} {...props}>
    <ChevronUp className="size-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

export const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton ref={ref} className={cn(scrollBtn, className)} {...props}>
    <ChevronDown className="size-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-[var(--radius-m)] py-2 pl-9 pr-3 text-sm font-medium outline-none " +
      "focus:bg-[color-mix(in_oklab,var(--tint)_14%,transparent)] focus:text-[var(--ink)] " +
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4 text-[var(--tint)]" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
