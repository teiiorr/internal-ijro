"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-5 p-7 " +
        "rounded-3xl border border-[var(--glass-border)] " +
        "bg-[var(--glass-fill-strong)] backdrop-blur-2xl backdrop-saturate-180 " +
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_24px_64px_-16px_rgba(15,17,28,0.20),0_8px_24px_-6px_rgba(15,17,28,0.12)] " +
        "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_24px_64px_-16px_rgba(0,0,0,0.7),0_8px_24px_-6px_rgba(0,0,0,0.4)]",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-5 top-5 size-9 rounded-full hover:bg-[var(--surface-3)] flex items-center justify-center transition-colors">
        <X className="size-4" />
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
  <DialogPrimitive.Title ref={ref} className={cn("text-xl font-bold tracking-tight font-display", className)} {...p} />
));
DialogTitle.displayName = "DialogTitle";
export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...p }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-[var(--muted)]", className)} {...p} />
));
DialogDescription.displayName = "DialogDescription";
export function DialogFooter({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex justify-end gap-2 pt-2", className)} {...p} />;
}
