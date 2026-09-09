"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconMessageCircle as MessageCircle, IconLoader2 as Loader } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { shareTaskToChat } from "@/server/actions/tasks";

/** Vazifani loyiha chatiga yuborish tugmasi (nazoratchi mas'ul uçun). */
export function ShareTaskChatButton({ taskId }: { taskId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await shareTaskToChat(taskId);
            toast.success(t("contractor.tasks.sharedToChat"));
            router.refresh();
          } catch {
            toast.error(t("common.error"));
          }
        })
      }
    >
      {pending ? <Loader className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
      {t("contractor.tasks.discussInChat")}
    </Button>
  );
}
