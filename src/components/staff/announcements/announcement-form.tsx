"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  IconPlus,
  IconTrash,
  IconLoader2,
  IconSpeakerphone,
  IconAlertTriangle,
  IconChartBar,
} from "@tabler/icons-react";
import { useRouter } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileInput } from "@/components/ui/file-input";
import { EmployeePicker } from "@/components/ui/employee-picker";
import { cn } from "@/lib/utils";
import { createAnnouncement } from "@/server/actions/announcements";
import type { ComposerOptions } from "@/server/queries/announcements";
import { ANNOUNCEMENT_MAX_FILE_BYTES, POLL_MAX_OPTIONS, POLL_MIN_OPTIONS, errorKey, normalizePollOptions } from "./logic";

type Mode = "all" | "departments" | "positions" | "people";
type Importance = "normal" | "important";

const CHECK = "size-4 shrink-0 accent-[var(--primary)]";

function initialMode(o: ComposerOptions): Mode {
  return o.allowed === "any" ? "all" : "departments";
}
function initialDepts(o: ComposerOptions): string[] {
  // Cheklangan rollar uchun ruxsat etilgan boʻlimlar oldindan belgilangan.
  return o.allowed === "any" ? [] : o.departments.map((d) => d.id);
}

/** "Yangi eʼlon" tugmasi + dialog. Eʼlonni FormData sifatida createAnnouncement'ga yuboradi. */
export function AnnouncementForm({ options, today }: { options: ComposerOptions; today: string }) {
  const t = useTranslations("staffX.announcements");
  const tr = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<Mode>(() => initialMode(options));
  const [deptIds, setDeptIds] = useState<string[]>(() => initialDepts(options));
  const [positions, setPositions] = useState<string[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [importance, setImportance] = useState<Importance>("normal");
  const [pinnedUntil, setPinnedUntil] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const [pollOn, setPollOn] = useState(false);
  const [question, setQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [multi, setMulti] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [closesAt, setClosesAt] = useState("");

  const isAny = options.allowed === "any";
  const modes: Mode[] = isAny ? ["all", "departments", "positions", "people"] : ["departments", "people"];
  const modeLabel: Record<Mode, string> = {
    all: t("audienceAll"),
    departments: t("audienceDepartments"),
    positions: t("audiencePositions"),
    people: t("audiencePeople"),
  };
  const noScope = !isAny && options.departments.length === 0;

  function reset() {
    setTitle("");
    setBody("");
    setMode(initialMode(options));
    setDeptIds(initialDepts(options));
    setPositions([]);
    setUserIds([]);
    setImportance("normal");
    setPinnedUntil("");
    setExpiresAt("");
    setFile(null);
    setFileKey((k) => k + 1);
    setPollOn(false);
    setQuestion("");
    setPollOptions(["", ""]);
    setMulti(false);
    setAnonymous(false);
    setClosesAt("");
  }

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  function buildAudience(): object | null {
    if (mode === "all") return isAny ? { all: true } : null;
    if (mode === "departments") return deptIds.length ? { departmentIds: deptIds } : null;
    if (mode === "positions") return positions.length ? { positions } : null;
    return userIds.length ? { userIds } : null;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tt = title.trim();
    if (tt.length < 3) {
      toast.error(t("errors.titleTooShort"));
      return;
    }
    const audience = buildAudience();
    if (!audience) {
      toast.error(t("errors.selectAudience"));
      return;
    }
    let poll: object | null = null;
    if (pollOn) {
      const opts = normalizePollOptions(pollOptions);
      if (!question.trim() || opts.length < POLL_MIN_OPTIONS) {
        toast.error(t("errors.pollInvalid"));
        return;
      }
      poll = { question: question.trim(), options: opts, multi, anonymous, closesAt: closesAt || null };
    }
    if (file && file.size > ANNOUNCEMENT_MAX_FILE_BYTES) {
      toast.error(t("errors.fileTooLarge"));
      return;
    }

    const fd = new FormData();
    fd.set("title", tt);
    fd.set("body", body);
    fd.set("audience", JSON.stringify(audience));
    fd.set("importance", importance);
    fd.set("pinnedUntil", pinnedUntil);
    fd.set("expiresAt", expiresAt);
    if (poll) fd.set("poll", JSON.stringify(poll));
    if (file) fd.set("file", file);

    start(async () => {
      try {
        const res = await createAnnouncement(fd);
        if (!res.ok) {
          toast.error(t(errorKey(res.error)));
          return;
        }
        toast.success(t("published"));
        reset();
        setOpen(false);
        router.refresh();
      } catch {
        toast.error(t("errors.generic"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <IconPlus className="size-4" />
          {t("new")}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-1.5rem)] max-h-[85vh] gap-4 overflow-y-auto p-5 sm:max-w-2xl sm:p-7">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <IconSpeakerphone className="size-5 shrink-0 text-[var(--primary)]" />
            <span className="min-w-0 break-words">{t("new")}</span>
          </DialogTitle>
          <DialogDescription>{t("formHint")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="min-w-0 space-y-5">
          {/* Sarlavha + matn */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">{t("fieldTitle")}</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              required
              placeholder={t("titlePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <Label htmlFor="ann-body">{t("fieldBody")}</Label>
              <span className="text-xs text-[var(--muted)]">{t("markdownHint")}</span>
            </div>
            <Textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              maxLength={20000}
              placeholder={t("bodyPlaceholder")}
            />
          </div>

          {/* Auditoriya */}
          <fieldset className="min-w-0 space-y-2.5">
            <legend className="mb-1.5 text-[13px] font-semibold">{t("audience")}</legend>
            {noScope ? (
              <p className="rounded-xl bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--muted)]">
                {t("noAllowedDepartments")}
              </p>
            ) : (
              <>
                <div
                  role="radiogroup"
                  aria-label={t("audience")}
                  className={cn("grid gap-1.5", modes.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}
                >
                  {modes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mode === m}
                      onClick={() => setMode(m)}
                      className={cn(
                        "min-w-0 truncate rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                        mode === m
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                      )}
                    >
                      {modeLabel[m]}
                    </button>
                  ))}
                </div>
                {!isAny && <p className="text-xs text-[var(--muted)]">{t("limitedHint")}</p>}

                {mode === "departments" && (
                  <div className="max-h-52 overflow-y-auto overscroll-contain rounded-xl border border-[var(--border)] p-2">
                    <div className="grid gap-1 sm:grid-cols-2">
                      {options.departments.map((d) => (
                        <label
                          key={d.id}
                          className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]"
                        >
                          <input
                            type="checkbox"
                            className={CHECK}
                            checked={deptIds.includes(d.id)}
                            onChange={() => toggle(deptIds, setDeptIds, d.id)}
                          />
                          <span className="min-w-0 break-words">{d.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {mode === "positions" && (
                  <div className="grid gap-1 rounded-xl border border-[var(--border)] p-2 sm:grid-cols-2">
                    {options.positions.map((p) => (
                      <label
                        key={p}
                        className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]"
                      >
                        <input
                          type="checkbox"
                          className={CHECK}
                          checked={positions.includes(p)}
                          onChange={() => toggle(positions, setPositions, p)}
                        />
                        <span className="min-w-0 break-words">{tr(`positions.${p}`)}</span>
                      </label>
                    ))}
                  </div>
                )}

                {mode === "people" && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[var(--muted)]">
                      {t("selectedCount", { count: userIds.length })}
                    </p>
                    <div className="max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-[var(--border)] p-2">
                      <EmployeePicker
                        people={options.people}
                        selectedIds={userIds}
                        onToggle={(id) => toggle(userIds, setUserIds, id)}
                        positionLabel={(p) => tr(`positions.${p}`)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </fieldset>

          {/* Muhimlik */}
          <fieldset className="min-w-0 space-y-2">
            <legend className="mb-1.5 text-[13px] font-semibold">{t("importance")}</legend>
            <div role="radiogroup" aria-label={t("importance")} className="grid grid-cols-2 gap-1.5 sm:max-w-sm">
              {(["normal", "important"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={importance === v}
                  onClick={() => setImportance(v)}
                  className={cn(
                    "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                    importance === v
                      ? v === "important"
                        ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
                        : "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                  )}
                >
                  {v === "important" && <IconAlertTriangle className="size-4 shrink-0" />}
                  <span className="truncate">{t(v)}</span>
                </button>
              ))}
            </div>
            {importance === "important" && <p className="text-xs text-[var(--muted)]">{t("importantHint")}</p>}
          </fieldset>

          {/* Sanalar */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="ann-pinned">{t("pinnedUntil")}</Label>
              <Input
                id="ann-pinned"
                type="date"
                min={today}
                value={pinnedUntil}
                onChange={(e) => setPinnedUntil(e.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="ann-expires">{t("expiresAt")}</Label>
              <Input
                id="ann-expires"
                type="date"
                min={today}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          {/* Ilova */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <Label>{t("attachment")}</Label>
              <span className="text-xs text-[var(--muted)]">{t("fileHint")}</span>
            </div>
            <FileInput key={fileKey} onFileChange={setFile} />
          </div>

          {/* Soʻrovnoma */}
          <div className="space-y-3 rounded-2xl border border-[var(--border)] p-3 sm:p-4">
            <button
              type="button"
              role="switch"
              aria-checked={pollOn}
              onClick={() => setPollOn((v) => !v)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold">
                <IconChartBar className="size-4 shrink-0 text-[var(--primary)]" />
                <span className="truncate">{t("addPoll")}</span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                  pollOn ? "bg-[var(--primary)]" : "bg-[var(--surface-3)]"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 size-5 rounded-full bg-[var(--card)] shadow-[var(--shadow-1)] transition-transform",
                    pollOn && "translate-x-5"
                  )}
                />
              </span>
            </button>

            {pollOn && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="ann-question">{t("pollQuestion")}</Label>
                  <Input
                    id="ann-question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    maxLength={500}
                    placeholder={t("questionPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        aria-label={t("pollOption", { n: i + 1 })}
                        value={opt}
                        onChange={(e) =>
                          setPollOptions((list) => list.map((x, j) => (j === i ? e.target.value : x)))
                        }
                        maxLength={255}
                        placeholder={t("pollOption", { n: i + 1 })}
                        className="min-w-0"
                      />
                      {pollOptions.length > POLL_MIN_OPTIONS && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("removeOption")}
                          onClick={() => setPollOptions((list) => list.filter((_, j) => j !== i))}
                          className="shrink-0 text-[var(--muted)] hover:text-[var(--danger)]"
                        >
                          <IconTrash className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < POLL_MAX_OPTIONS && (
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      onClick={() => setPollOptions((list) => [...list, ""])}
                    >
                      <IconPlus className="size-4" />
                      {t("addOption")}
                    </Button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex min-w-0 cursor-pointer items-center gap-2.5 text-sm">
                    <input type="checkbox" className={CHECK} checked={multi} onChange={(e) => setMulti(e.target.checked)} />
                    <span className="min-w-0 break-words">{t("multi")}</span>
                  </label>
                  <label className="flex min-w-0 cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      className={CHECK}
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                    />
                    <span className="min-w-0 break-words">{t("anonymous")}</span>
                  </label>
                </div>
                <div className="space-y-1.5 sm:max-w-[50%]">
                  <Label htmlFor="ann-closes">{t("closesAt")}</Label>
                  <Input
                    id="ann-closes"
                    type="date"
                    min={today}
                    value={closesAt}
                    onChange={(e) => setClosesAt(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {tr("common.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || noScope}>
              {pending ? <IconLoader2 className="size-4 animate-spin" /> : <IconSpeakerphone className="size-4" />}
              {t("publish")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
