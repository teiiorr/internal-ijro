"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { IconX as X } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * BIIB dialog (A4.4.6): oyna chrome (ruxsat etilgan), radius 24 (`--radius-panel`), p-6.
 * Bo'limlar bo'shliq yoki bitta `--line` ajratgich bilan ajraladi — ichida ramkalangan
 * quti bo'lmaydi (oyna-ustida-oyna emas). Yopish tugmasi — 44px призрач boshqaruv, radius 12.
 */
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--ink)_32%,transparent)] backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-5 p-6 " +
        // Bolalar (form/matn) dialog kengligidan oshib ketmasin — uzun matn qirqilsin, gorizontal scroll bo'lmasin.
        "[&>*]:min-w-0 " +
        // Baland dialoglar ekrandan chiqib ketmasdan o'z ichida scroll bo'lishi kerak.
        "max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain " +
        "rounded-[var(--radius-panel)] glass-strong text-[var(--ink)] " +
        "data-[state=open]:animate-in data-[state=closed]:animate-out " +
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 " +
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 grid size-11 place-items-center rounded-[var(--radius-control)] text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]">
        <X className="size-5" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...p} />;
}
export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...p }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-[family-name:var(--font-ui)] text-[1.1875rem] font-bold tracking-tight text-[var(--ink)]", className)}
    {...p}
  />
));
DialogTitle.displayName = "DialogTitle";
export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...p }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("t-small text-[var(--ink-2)]", className)} {...p} />
));
DialogDescription.displayName = "DialogDescription";
export function DialogFooter({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex justify-end gap-2 pt-2", className)} {...p} />;
}
