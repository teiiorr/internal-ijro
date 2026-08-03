"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteContest } from "@/server/actions/contests";

export function ContestDeleteButton({ contestId }: { contestId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
      onClick={() => {
        if (!confirm(t("tanlov.deleteConfirm"))) return;
        start(async () => {
          await deleteContest(contestId);
          router.push("/tanlov");
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      {t("common.delete")}
    </Button>
  );
}
