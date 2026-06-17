"use client";
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectGroup = SelectPrimitive.Group;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-[var(--border-strong)] " +
      "bg-[var(--glass-fill-strong)] backdrop-blur-xl backdrop-saturate-180 " +
      "px-4 text-[15px] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] " +
      "transition-[border-color,box-shadow] duration-200 " +
      "focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_4px_var(--primary-soft)] " +
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="size-4 opacity-60" />
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
        "relative z-50 min-w-[10rem] overflow-hidden " +
        "rounded-2xl border border-[var(--glass-border)] " +
        "bg-[var(--glass-fill-strong)] backdrop-blur-2xl backdrop-saturate-180 " +
        "text-[var(--popover-foreground)] " +
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_16px_40px_-12px_rgba(15,17,28,0.18)]",
        position === "popper" && "data-[side=bottom]:translate-y-1",
        className
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1.5">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-xl py-2 pl-9 pr-3 text-sm outline-none " +
      "focus:bg-[var(--primary-soft)] focus:text-[var(--foreground)] " +
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4 text-[var(--primary)]" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
