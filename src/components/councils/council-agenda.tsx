"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconTrash as Trash2, IconPlus as Plus } from "@tabler/icons-react";
import { addAgendaItem, deleteAgendaItem } from "@/server/actions/councils";

type AgendaRow = {
  id: string;
  topic: string;
  projectName: string | null;
  studioName: string | null;
};
type Option = { id: string; name: string };

export function CouncilAgenda({
  meetingId,
  items,
  projects,
  canManage,
}: {
  meetingId: string;
  items: AgendaRow[];
  projects: Option[];
  canManage: boolean;
}) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [topic, setTopic] = useState("");
  const [projectText, setProjectText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const field =
    "h-12 w-full rounded-[var(--radius-m)] border border-[var(--line-strong)] bg-[var(--surface)] px-4 t-body text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none";

  function add() {
    setError(null);
    if (!topic.trim()) { setError(t("kengash.newTopic")); return; }
    // Kiritilgan qiymat röyxatdagi loyihaga mos kelsa, id böyicha boğlanadi (studiya
    // loyihadan avtomatik aniqlanadi); aks holda erkin matn nom sifatida saqlanadi.
    const proj = projects.find((p) => p.name.trim().toLowerCase() === projectText.trim().toLowerCase());
    start(async () => {
      try {
        await addAgendaItem({
          meetingId,
          topic: topic.trim(),
          projectId: proj?.id ?? null,
          projectName: proj ? null : projectText.trim() || null,
          presenterUserId: null,
          presenterName: null,
        });
        setTopic(""); setProjectText("");
      } catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <div className="space-y-4">
      {/* desktop jadvali — qirrali kataklarsiz: faqat sarlavha osti chizigʻi + qator ajratuvchilari */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left t-micro text-[var(--ink-3)]">
              <th className="w-10 py-2.5 pr-3 font-semibold">№</th>
              <th className="py-2.5 pr-3 font-semibold">{t("kengash.topic")}</th>
              <th className="py-2.5 pr-3 font-semibold">{t("kengash.project")}</th>
              <th className="py-2.5 pr-3 font-semibold">{t("kengash.studio")}</th>
              {canManage && <th className="w-10 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {items.map((row, i) => (
              <tr key={row.id} className="align-top">
                <td className="py-3 pr-3 font-semibold tabular-nums text-[var(--ink-3)]">{i + 1}</td>
                <td className="py-3 pr-3 font-medium text-[var(--ink)]">{row.topic}</td>
                <td className="py-3 pr-3 text-[var(--ink-2)]">{row.projectName ?? "—"}</td>
                <td className="py-3 pr-3 text-[var(--ink-2)]">{row.studioName ?? "—"}</td>
                {canManage && (
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={t("common.delete")} onClick={() => start(async () => { await deleteAgendaItem(row.id); })}>
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={canManage ? 5 : 4} className="py-8 text-center text-[var(--ink-3)]">{t("kengash.noItems")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* mobil — ajratuvchi qatorlar (quti emas) */}
      <div className="divide-y divide-[var(--line)] sm:hidden">
        {items.map((row, i) => (
          <div key={row.id} className="py-3 first:pt-0">
            <div className="flex items-start gap-2">
              <span className="font-bold tabular-nums text-[var(--ink-3)]">{i + 1}.</span>
              <p className="min-w-0 flex-1 font-medium text-[var(--ink)]">{row.topic}</p>
              {canManage && (
                <Button variant="ghost" size="icon-sm" className="-mr-1 -mt-1 shrink-0" disabled={pending} aria-label={t("common.delete")} onClick={() => start(async () => { await deleteAgendaItem(row.id); })}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <dl className="mt-2 space-y-1 pl-6 text-sm">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-[var(--ink-3)]">{t("kengash.project")}</dt>
                <dd className="font-medium text-[var(--ink)]">{row.projectName ?? "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-[var(--ink-3)]">{t("kengash.studio")}</dt>
                <dd className="font-medium text-[var(--ink)]">{row.studioName ?? "—"}</dd>
              </div>
            </dl>
          </div>
        ))}
        {items.length === 0 && <p className="py-8 text-center text-[var(--ink-3)]">{t("kengash.noItems")}</p>}
      </div>

      {/* qator qoʻshish */}
      {canManage && (
        <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-[1fr_220px_auto] sm:items-center">
          <Input placeholder={t("kengash.topic")} value={topic} onChange={(e) => setTopic(e.target.value)} />
          <input
            list={`proj-${meetingId}`}
            className={field}
            placeholder={t("kengash.projectField")}
            value={projectText}
            onChange={(e) => setProjectText(e.target.value)}
            maxLength={255}
          />
          <datalist id={`proj-${meetingId}`}>
            {projects.map((p) => <option key={p.id} value={p.name} />)}
          </datalist>
          <Button onClick={add} disabled={pending}><Plus className="size-4" />{t("kengash.addItem")}</Button>
        </div>
      )}
      {error && <p className="t-small text-[var(--danger)]">{error}</p>}
    </div>
  );
}
