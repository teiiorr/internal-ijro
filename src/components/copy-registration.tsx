"use client";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function CopyRegistration({ regNum }: { regNum: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(regNum);
          setCopied(true);
          toast.success("Nusxa olindi", { description: `№ ${regNum}` });
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Nusxa olib bo'lmadi");
        }
      }}
      className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] px-3 py-1 text-xs font-bold tabular tracking-tight hover:bg-[var(--primary-soft-strong)] transition-colors"
    >
      № {regNum}
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5 opacity-70" />}
    </button>
  );
}
