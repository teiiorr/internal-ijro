"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trophy, Users, CalendarDays, Sparkles, ImagePlus, Trash2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContestForm } from "@/components/contests/contest-form";
import { WinnerReveal } from "@/components/contests/winner-reveal";
import { deleteContest, removeContestPhoto } from "@/server/actions/contests";
import { compressImage } from "@/lib/images/compress";
import { formatDate } from "@/lib/dates";
import type { ContestWithPhotos } from "@/server/queries/contests";

export function ContestCard({ contest, canManage }: { contest: ContestWithPhotos; canManage: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reveal, setReveal] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [active, setActive] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const photos = contest.photos;
  const hero = photos[Math.min(active, photos.length - 1)];
  const winner = contest.winnerName || contest.winnerProjectName || "";

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      let f = file;
      try { const r = await compressImage(file); f = r.file; } catch { /* upload original */ }
      const qs = new URLSearchParams({ contestId: contest.id, name: f.name });
      const res = await fetch(`/api/files/contest-photos?${qs.toString()}`, {
        method: "POST",
        headers: { "content-type": f.type || "application/octet-stream" },
        body: f,
      });
      if (!res.ok) { toast.error(t("tanlov.photoError")); return; }
      toast.success(t("tanlov.photoAdded"));
      router.refresh();
    } catch {
      toast.error(t("tanlov.photoError"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]">
        {/* Hero photo / placeholder */}
        <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.fileUrl} alt={hero.caption ?? contest.name} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-[var(--subtle)]">
              <Trophy className="size-12" />
            </div>
          )}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
            <Users className="size-3.5" /> {contest.participantsCount} {t("tanlov.participantsShort")}
          </span>
          {canManage && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-black/65"
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
              {t("tanlov.addPhoto")}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPickPhoto} />
        </div>

        {/* Thumbnails */}
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] p-2 no-scrollbar">
            {photos.map((p, i) => (
              <div key={p.id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  className={`block size-14 overflow-hidden rounded-lg ring-2 transition-all ${i === active ? "ring-[var(--primary)]" : "ring-transparent hover:ring-[var(--border-strong)]"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.fileUrl} alt="" className="size-full object-cover" />
                </button>
                {canManage && (
                  <button
                    type="button"
                    aria-label={t("common.delete")}
                    disabled={pending}
                    onClick={() => start(async () => { await removeContestPhoto(p.id); router.refresh(); })}
                    className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[var(--danger)] text-white shadow"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-snug break-words sm:text-lg">{contest.name}</h3>
            {contest.heldAt && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <CalendarDays className="size-3.5" /> {formatDate(contest.heldAt)}
              </p>
            )}
          </div>

          {contest.description && (
            <p className="text-sm leading-relaxed text-[var(--muted)] line-clamp-3">{contest.description}</p>
          )}

          {/* Winner reveal */}
          <div className="mt-auto pt-1">
            {winner ? (
              revealed ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-[#ffd54a]/30 bg-[#ffd54a]/10 px-3.5 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#ffe17a] to-[#c9982a] text-lg">🏆</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{t("tanlov.winner")}</p>
                    <p className="truncate text-sm font-bold" title={winner}>{winner}</p>
                  </div>
                  <button onClick={() => setReveal(true)} className="ml-auto shrink-0 text-xs font-semibold text-[var(--primary)] hover:underline">
                    {t("tanlov.replay")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setReveal(true); setRevealed(true); }}
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#c9982a] via-[#ffd54a] to-[#c9982a] px-4 py-3 text-sm font-extrabold text-[#3a2a00] shadow-[0_8px_24px_-8px_rgba(201,152,42,0.7)] transition-transform hover:scale-[1.02] active:scale-100"
                >
                  <Sparkles className="size-4" />
                  {t("tanlov.revealWinner")}
                </button>
              )
            ) : (
              <p className="rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-2.5 text-center text-xs text-[var(--muted)]">
                {t("tanlov.noWinner")}
              </p>
            )}
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
              <ContestForm contest={contest} />
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                onClick={() => {
                  if (!confirm(t("tanlov.deleteConfirm"))) return;
                  start(async () => { await deleteContest(contest.id); router.refresh(); });
                }}
              >
                <Trash2 className="size-4" /> {t("common.delete")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {reveal && winner && (
        <WinnerReveal
          contestName={contest.name}
          winnerName={winner}
          photoUrl={hero?.fileUrl}
          onClose={() => setReveal(false)}
        />
      )}
    </>
  );
}
