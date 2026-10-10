"use client";
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

/**
 * BIIB ichki-boshqaruv (A4.4.2): oyna emas — `--surface-2` yoʻlak, radius 12 (kapsula emas).
 * Faol trigger `--surface` yarmi bilan suriladigan indikator koʻrinishida ajralib turadi.
 */
export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...p }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center justify-start gap-1 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-2)] p-1 text-[var(--ink-2)]",
      className
    )}
    {...p}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...p }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 py-1.5 text-[13px] font-semibold " +
      "transition-colors duration-[var(--dur-ui)] ease-[var(--ease-ui)] " +
      "text-[var(--ink-2)] [@media(hover:hover)]:hover:text-[var(--ink)] " +
      "data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--ink)] data-[state=active]:shadow-[var(--shadow-1)]",
      className
    )}
    {...p}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...p }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4", className)} {...p} />
));
TabsContent.displayName = "TabsContent";
