"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconExternalLink,
  IconFileText,
  IconCircleCheck,
  IconLoader2,
  IconInfoCircle,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { acknowledgeDocument, markAckOpened } from "@/server/actions/normative-ack";
import { errorKey } from "./logic";

/**
 * "Ochish" + "Tanishib chiqdim". The acknowledge button stays disabled until the document
 * was opened (server-side the action is rejected with open_first as well).
 * "Ochish" is a real link (new tab) so popup blockers never interfere; the open is recorded alongside.
 */
export function AckButton({
  requestId,
  fileUrl,
  isLink,
  openedAt,
}: {
  requestId: string;
  fileUrl: string;
  isLink: boolean;
  openedAt: Date | string | null;
}) {
  const t = useTranslations("staffX.normativeAck");
  const router = useRouter();
  const [openedLocal, setOpenedLocal] = useState(false);
  const [opening, startOpening] = useTransition();
  const [acking, startAck] = useTransition();
  const opened = openedLocal || !!openedAt;

  function onOpen() {
    startOpening(async () => {
      try {
        const res = await markAckOpened(requestId);
        if (!res.ok) {
          toast.error(t(errorKey(res.error)));
          return;
        }
        setOpenedLocal(true);
      } catch {
        toast.error(t("errors.generic"));
      }
    });
  }

  function onAcknowledge() {
    if (!opened) {
      toast.error(t("openFirst"));
      return;
    }
    startAck(async () => {
      try {
        const res = await acknowledgeDocument(requestId);
        if (!res.ok) {
          toast.error(t(errorKey(res.error)));
          return;
        }
        toast.success(t("acknowledgedToast"));
        router.refresh();
      } catch {
        toast.error(t("errors.generic"));
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            // Middle-click also opens the document in a new tab.
            onAuxClick={(e) => {
              if (e.button === 1) onOpen();
            }}
          >
            {opening ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : isLink ? (
              <IconExternalLink className="size-4" />
            ) : (
              <IconFileText className="size-4" />
            )}
            {t("open")}
          </a>
        </Button>
        <Button
          type="button"
          variant="success"
          size="sm"
          className="w-full sm:w-auto"
          disabled={!opened || acking || opening}
          title={opened ? undefined : t("openFirst")}
          onClick={onAcknowledge}
        >
          {acking ? <IconLoader2 className="size-4 animate-spin" /> : <IconCircleCheck className="size-4" />}
          {t("acknowledge")}
        </Button>
      </div>
      <p className="flex items-start gap-1 t-micro leading-snug text-[var(--ink-3)]">
        <IconInfoCircle className="mt-px size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 break-words">{opened ? t("ackNote") : t("openFirst")}</span>
      </p>
    </div>
  );
}
