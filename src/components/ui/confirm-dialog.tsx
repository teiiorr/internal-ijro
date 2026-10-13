"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" — qizil asosiy tugma (o'chirish kabi qaytarib bo'lmas amallar). */
  tone?: "default" | "danger";
};

type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Imperativ tasdiq oynasi — native window.confirm() o'rnida.
 * Chaqiruv joyi: `const confirm = useConfirm(); if (!(await confirm({description}))) return;`
 * Radix Dialog ustida qurilgani uchun fokus tutqichi, Escape va skrinrider qo'llab-quvvatlanadi.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm <ConfirmProvider> ichida ishlatilishi kerak");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o = {}) => {
    setOpts(o);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((v: boolean) => {
    setOpen(false);
    resolver.current?.(v);
    resolver.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(o) => { if (!o) settle(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle>{opts.title ?? t("common.confirmTitle")}</DialogTitle>
            {opts.description && (
              <DialogDescription className="break-words [overflow-wrap:anywhere]">
                {opts.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => settle(false)} className="w-full sm:w-auto">
              {opts.cancelLabel ?? t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant={opts.tone === "danger" ? "destructive" : "default"}
              onClick={() => settle(true)}
              className="w-full sm:w-auto"
            >
              {opts.confirmLabel ?? t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
