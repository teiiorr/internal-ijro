"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPencil as Pencil, IconCheck as Check, IconX as X } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { cn } from "@/lib/utils";
import { setAgendaDecision } from "@/server/actions/councils";

const DECISION_STATUSES = ["pending", "approved", "rejected", "deferred"] as const;
type DecisionStatus = (typeof DECISION_STATUSES)[number];

// Qaror holati → plashka tusi: ma'qullandi=yashil, rad=qizil, keyinga=sariq, kutilmoqda=neytral.
const TONE: Record<DecisionStatus, StatusTone> = {
  approved: "success",
  rejected: "danger",
  deferred: "warning",
  pending: "neutral",
};

function normalize(s: string): DecisionStatus {
  return (DECISION_STATUSES as readonly string[]).includes(s) ? (s as DecisionStatus) : "pending";
}

/**
 * Kengash qarori — har bir kun tartibi bandida holat plashkasi (burchakli), va menejerlar
 * uçun ötkazgich: 4 holatdan birini tanlash + erkin matnli qaror. Saqlash setAgendaDecision
 * orqali, sahifa revalidate bilan yangilanadi. Oynasiz, ixcham, BIIB.
 */
export function CouncilDecision({
  itemId,
  status,
  decision,
  canManage,
}: {
  itemId: string;
  status: string;
  decision: string | null;
  canManage: boolean;
}) {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [draftStatus, setDraftStatus] = useState<DecisionStatus>(normalize(status));
  const [draftText, setDraftText] = useState(decision ?? "");

  const current = normalize(status);
  const label = (s: DecisionStatus) => t(`kengash.decision.${s}` as "kengash.decision.pending");

  function open() {
    setDraftStatus(current);
    setDraftText(decision ?? "");
    setEditing(true);
  }

  function save() {
    start(async () => {
      try {
        const r = await setAgendaDecision(itemId, { decisionStatus: draftStatus, decision: draftText.trim() || null });
        if (!r.ok) {
          toast.error(t(`common.actionErrors.${r.error}` as "common.actionErrors.not_found"));
          return;
        }
        toast.success(t("kengash.protocol.decisionSaved"));
        setEditing(false);
      } catch {
        toast.error(t("common.error"));
      }
    });
  }

  if (canManage && editing) {
    return (
      <div className="space-y-2">
        {/* 4 holat — tanlangani töliq, qolganlari xira */}
        <div className="flex flex-wrap gap-1.5">
          {DECISION_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={draftStatus === s}
              onClick={() => setDraftStatus(s)}
              className={cn(
                "rounded-[var(--radius-control)] transition-opacity",
                draftStatus === s ? "opacity-100" : "opacity-40 hover:opacity-70",
              )}
            >
              <Status tone={TONE[s]}>{label(s)}</Status>
            </button>
          ))}
        </div>
        <Textarea
          className="min-h-16"
          placeholder={t("kengash.protocol.decisionPlaceholder")}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          maxLength={2000}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={pending}>
            <Check className="size-4" />
            {t("common.save")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
            <X className="size-4" />
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2">
        <Status tone={TONE[current]}>{label(current)}</Status>
        {canManage && (
          <Button variant="ghost" size="icon-sm" className="-my-1" aria-label={t("kengash.protocol.setDecision")} onClick={open}>
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>
      {decision && <p className="t-small text-[var(--ink-2)]">{decision}</p>}
    </div>
  );
}
