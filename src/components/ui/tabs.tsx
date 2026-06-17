"use client";
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...p }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-12 items-center justify-start gap-1 rounded-2xl glass p-1.5 text-[var(--muted)]",
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
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-1.5 text-sm font-semibold transition-all " +
      "data-[state=active]:bg-[var(--glass-fill-strong)] data-[state=active]:text-[var(--foreground)] " +
      "data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_8px_-2px_rgba(20,25,60,0.10)] " +
      "hover:text-[var(--foreground)]",
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
