"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconUpload as Upload, IconLoader2 as Loader } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/images/compress";

/** Lets a studio upload a deliverable directly to the stage they're viewing. */
export function StudioStageUpload({ projectId, stageId, maxBytes = 104857600 }: { projectId: string; stageId: string; maxBytes?: number }) {
  const t = useTranslations();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      let f = file;
      if (file.type.startsWith("image/")) {
        try { const r = await compressImage(file); f = r.file; } catch { /* keep original */ }
      }
      if (f.size > maxBytes) { toast.error(t("projects.chat.fileTooLarge")); return; }
      const qs = new URLSearchParams({ projectId, stageId, name: f.name });
      const res = await fetch(`/api/files/studio-docs?${qs.toString()}`, {
        method: "POST",
        headers: { "content-type": f.type || "application/octet-stream" },
        body: f,
      });
      if (!res.ok) { toast.error(t("projects.chat.uploadError")); return; }
      toast.success(t("common.saved"));
      router.refresh();
    } catch {
      toast.error(t("projects.chat.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input ref={fileRef} type="file" className="sr-only" onChange={onPick} />
      <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} size="sm">
        {uploading ? <Loader className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {t("common.upload")}
      </Button>
    </>
  );
}
