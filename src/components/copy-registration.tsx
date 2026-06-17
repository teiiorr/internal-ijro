"use client";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function CopyRegistration({ regNum }: { regNum: string }) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(regNum);
          setCopied(true);
          toast.success(t("common.copy.success"), { description: `№ ${regNum}` });
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error(t("common.copy.failed"));
        }
      }}
      className="inline-flex items-center gap-2 rounded-sm bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] px-2.5 py-1 text-xs font-medium tabular hover:bg-[var(--surface-3)] transition-colors"
    >
      № {regNum}
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5 opacity-70" />}
    </button>
  );
}
