"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { IconDownload as Download, IconLoader2 as Loader2, IconCheck as Check } from "@tabler/icons-react";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { FileKindIcon } from "@/components/files/file-kind-icon";
import { AttachmentDropzone } from "@/components/tasks/attachment-queue";
import { humanSize } from "@/lib/files/file-kind";

const MAX_BYTES = 30 * 1024 * 1024;

type Item = {
  key: string;
  name: string;
  status: "working" | "done" | "error";
  outName?: string;
  url?: string;
  changed?: number;
  source?: string;
  error?: string;
};

/**
 * Word faylini (DOCX) yangi lotin alifbosiga ögiriş: fayl serverda ögiriladi va darhol qaytariladi
 * (saqlanmaydi). Bir neça faylni birdaniga taşlaş mumkin; har biri uçun tayyor DOCX yuklab olinadi.
 */
export function AlphabetConverter() {
  const t = useTranslations("internalDocs.alphabet");
  const [items, setItems] = useState<Item[]>([]);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const patch = (key: string, p: Partial<Item>) => setItems((prev) => prev.map((x) => (x.key === key ? { ...x, ...p } : x)));

  async function convert(files: File[]) {
    const batch = files.map((f) => ({ file: f, key: `${f.name}:${f.size}:${Math.random().toString(36).slice(2)}` }));
    setItems((prev) => [...batch.map(({ file, key }) => ({ key, name: file.name, status: "working" as const })), ...prev]);
    for (const { file, key } of batch) {
      if (!/\.docx$/i.test(file.name)) {
        patch(key, { status: "error", error: t(/\.doc$/i.test(file.name) ? "errors.doc" : "errors.not_docx") });
        continue;
      }
      if (file.size > MAX_BYTES) {
        patch(key, { status: "error", error: t("errors.file_too_large", { max: humanSize(MAX_BYTES) }) });
        continue;
      }
      try {
        const res = await fetch(`/api/yangi-alifbo?name=${encodeURIComponent(file.name)}`, {
          method: "POST",
          headers: { "content-type": "application/octet-stream" },
          body: file,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          const code = ["not_docx", "encrypted", "unsupported", "file_too_large", "file_empty"].includes(body.error ?? "") ? body.error! : "failed";
          patch(key, { status: "error", error: t(`errors.${code}` as "errors.failed", { max: humanSize(MAX_BYTES) }) });
          continue;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        patch(key, {
          status: "done",
          url,
          outName: decodeURIComponent(res.headers.get("X-Alifbo-Name") ?? file.name),
          changed: Number(res.headers.get("X-Alifbo-Changed") ?? 0),
          source: res.headers.get("X-Alifbo-Source") ?? "none",
        });
      } catch {
        patch(key, { status: "error", error: t("errors.failed") });
      }
    }
  }

  const sourceLabel = (s?: string) => (s === "cyrl" ? t("source.cyrl") : s === "latn" ? t("source.latn") : s === "mixed" ? t("source.mixed") : t("source.none"));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card>
        <p className="t-body text-[var(--ink-2)]">{t("intro")}</p>
        <div className="mt-4">
          <AttachmentDropzone
            onFiles={convert}
            maxBytes={MAX_BYTES}
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            title={t("dropTitle")}
            hint={t("dropHint", { max: humanSize(MAX_BYTES) })}
          />
        </div>
        <p className="mt-3 t-small text-[var(--ink-3)]">{t("rules")}</p>
      </Card>

      {items.length > 0 && (
        <Card bare className="px-5 sm:px-6">
          <Rows>
            {items.map((x) => (
              <Row key={x.key} className="flex-wrap gap-y-1.5 sm:flex-nowrap">
                <FileKindIcon fileName={x.outName ?? x.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]" title={x.outName ?? x.name}>
                    {x.outName ?? x.name}
                  </p>
                  {x.status === "working" && <p className="mt-0.5 t-small text-[var(--ink-3)]">{t("working")}</p>}
                  {x.status === "error" && <p className="mt-0.5 break-words t-small text-[var(--danger)]">{x.error}</p>}
                  {x.status === "done" && (
                    <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">
                      {x.changed ? `${sourceLabel(x.source)}, ${t("changed", { count: x.changed })}` : t("nothing")}
                    </p>
                  )}
                </div>
                {x.status === "working" && <Loader2 className="size-5 shrink-0 animate-spin text-[var(--tint)]" aria-hidden />}
                {x.status === "done" && x.url && (
                  <a
                    href={x.url}
                    download={x.outName}
                    className="ml-[52px] inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--tint)] px-4 text-sm font-semibold text-[var(--on-tint)] transition-colors hover:bg-[var(--tint-hover)] sm:ml-0"
                  >
                    {x.changed ? <Download className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
                    {t("download")}
                  </a>
                )}
              </Row>
            ))}
          </Rows>
        </Card>
      )}
    </div>
  );
}
