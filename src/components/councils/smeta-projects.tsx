"use client";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconPlus as Plus, IconX as X, IconFileInvoice as FileInvoice, IconChevronDown as ChevronDown, IconCheck as Check, IconSearch as Search } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { matchesLayoutQuery } from "@/lib/search-layout";
import { addSmetaCommissionProject, removeSmetaCommissionProject, setSmetaProjectStatus, type SmetaProjectError } from "@/server/actions/smeta-commission";
import type { SmetaCommissionProject, SmetaStatus } from "@/server/queries/smeta-commission";

type ProjectOption = { id: string; name: string; posterUrl: string | null; genre: string | null };
type Mode = "existing" | "scratch";

/** Holat tuslari — burchakli plashka (Status) va tanlagich uchun. */
const STATUS_TONE: Record<SmetaStatus, StatusTone> = { jarayonda: "warning", xulosa_berildi: "success", qaytarildi: "danger" };
const STATUS_KEY: Record<SmetaStatus, "jarayonda" | "xulosaBerildi" | "qaytarildi"> = { jarayonda: "jarayonda", xulosa_berildi: "xulosaBerildi", qaytarildi: "qaytarildi" };
const STATUS_ALL: readonly SmetaStatus[] = ["jarayonda", "xulosa_berildi", "qaytarildi"] as const;

/**
 * Komissiya qarori holati — burchakli rangli plashka (sariq/yashil/qizil). Boshqaruvchilarга
 * (canManage) uchligi bir ghost ochiluvchi menyuda oʻzgartiriladi; boshqalarга faqat plashka.
 * Pilula/dumaloq yoʻq — burchakli plashka (tag-plate). i18n: kengash.smetaProjects.status.
 */
export function SmetaStatusControl({
  id,
  status,
  canManage,
  align = "end",
}: {
  id: string;
  status: SmetaStatus;
  canManage: boolean;
  align?: "start" | "end";
}) {
  const t = useTranslations("kengash.smetaProjects");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState<SmetaStatus>(status);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Server qiymati yangilansa (router.refresh), mahalliy holatni moslaymiz.
  useEffect(() => setValue(status), [status]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const plate = (s: SmetaStatus) => <Status tone={STATUS_TONE[s]}>{t(`status.${STATUS_KEY[s]}`)}</Status>;

  if (!canManage) return <span className="shrink-0">{plate(value)}</span>;

  function change(next: SmetaStatus) {
    setOpen(false);
    if (next === value || pending) return;
    const prev = value;
    setValue(next); // optimistik
    start(async () => {
      const r = await setSmetaProjectStatus(id, next);
      if (!r.ok) {
        setValue(prev);
        toast.error(t(`errors.${r.error}`));
        return;
      }
      toast.success(t("status.updated"));
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("status.label")}
        title={t("status.label")}
        className="inline-flex items-center gap-1 rounded-[var(--radius-control)] p-0.5 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-60"
      >
        {plate(value)}
        <ChevronDown className={cn("size-3.5 text-[var(--ink-3)] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-[calc(100%+4px)] z-20 min-w-[11rem] rounded-[var(--radius-m)] border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--shadow-2)]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {STATUS_ALL.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitemradio"
              aria-checked={s === value}
              onClick={() => change(s)}
              className={cn(
                "flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-2)]",
                s === value && "bg-[var(--surface-2)]",
              )}
            >
              {plate(s)}
              {s === value && <Check className="ml-auto size-4 shrink-0 text-[var(--tint)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Kichik kvadrat poster (nisbati saqlanadi); poster yoʻq boʻlsa — nom bosh harfi. */
export function Poster({ url, name, className }: { url: string | null; name: string; className?: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        loading="lazy"
        decoding="async"
        className={cn("aspect-square w-full rounded-[var(--radius-m)] border border-[var(--line)] object-cover", className)}
      />
    );
  }
  return (
    <div className={cn("grid aspect-square w-full place-items-center rounded-[var(--radius-m)] border border-[var(--line)] bg-[var(--surface-2)]", className)}>
      <span className="select-none text-lg font-black text-[var(--ink-3)]">{name.trim().charAt(0).toUpperCase() || "?"}</span>
    </div>
  );
}

/**
 * Smeta komissiyasiga yoʻnaltirilgan loyihalar — "son"lar boʻyicha guruhlangan. Har bir
 * son uchun alohida kichik seksiya; loyiha ikki yoʻl bilan qoʻshiladi: mavjud loyihadan
 * (poster + maʼlumot koʻchiriladi) yoki yangidan. BIIB uslubi — pilula yoʻq, holat belgisi
 * burchakli (signal flag).
 */
export function SmetaProjects({
  items,
  projects,
  canManage,
  ready,
}: {
  items: SmetaCommissionProject[];
  projects: ProjectOption[];
  canManage: boolean;
  ready: boolean;
}) {
  const t = useTranslations("kengash.smetaProjects");
  const locale = useLocale();
  const router = useRouter();
  const listId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("existing");
  const [son, setSon] = useState("");
  const [name, setName] = useState("");
  const [info, setInfo] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const canAdd = canManage && ready;

  // Forma ochilganda birinchi maydonga fokus.
  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open, mode]);

  // Nishon son (forma ichidagi qiymat) — boʻsh boʻlsa «Hozir koʻrib chiqilayotgan» (null).
  const targetSon = useMemo(() => {
    const n = Number.parseInt(son, 10);
    return son.trim() !== "" && Number.isInteger(n) && n >= 1 ? n : null;
  }, [son]);
  // Band nomlar — FAQAT nishon son ichida: bitta loyiha turli sonlarga qoʻshilishi mumkin.
  const takenInSon = useMemo(
    () => new Set(items.filter((i) => i.sessionNumber === targetSon).map((i) => i.name.toLowerCase())),
    [items, targetSon],
  );
  const suggestions = useMemo(() => projects.filter((p) => !takenInSon.has(p.name.toLowerCase())), [projects, takenInSon]);

  // Tanlangan mavjud loyiha (nom aynan mos kelsa) — poster/maʼlumotni koʻrsatish uchun.
  const picked = useMemo(() => {
    const key = name.trim().toLowerCase();
    return key ? projects.find((p) => p.name.toLowerCase() === key) ?? null : null;
  }, [name, projects]);

  // Sonsiz loyihalar — standart koʻrinish («Hozir koʻrib chiqilayotgan»).
  const noSonItems = useMemo(() => items.filter((it) => it.sessionNumber === null), [items]);
  // Real vaqtli qidiruv — barcha sonlardan nom boʻyicha (klaviatura joylashuvini sezmaydi).
  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return items.filter((it) => matchesLayoutQuery(it.name, q));
  }, [query, items]);

  const errorText = (e: SmetaProjectError) => t(`errors.${e}`);

  function resetFields() {
    setName("");
    setInfo("");
    setPosterUrl("");
    setError(null);
  }

  function openForm(prefillSon?: number | null) {
    // Boʻsh son — «Hozir koʻrib chiqilayotgan» (sonsiz). Raqam berilsa — oʻsha son.
    setSon(prefillSon == null ? "" : String(prefillSon));
    resetFields();
    setOpen(true);
  }

  function close() {
    setOpen(false);
    resetFields();
  }

  function switchMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    resetFields();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Boʻsh son — «Hozir koʻrib chiqilayotgan» (sonsiz loyiha).
    const sessionNumber = son.trim() === "" ? null : Number.parseInt(son, 10);
    if (sessionNumber !== null && (!Number.isInteger(sessionNumber) || sessionNumber < 1)) return setError(errorText("invalid"));

    const trimmedInfo = info.trim();

    if (mode === "existing") {
      if (!picked) return setError(errorText("invalid"));
      if (takenInSon.has(picked.name.toLowerCase())) return setError(errorText("duplicate"));
      setError(null);
      start(async () => {
        const r = await addSmetaCommissionProject({
          mode: "existing",
          sessionNumber,
          projectId: picked.id,
          info: trimmedInfo || null,
        });
        if (!r.ok) return setError(errorText(r.error));
        resetFields();
        toast.success(t("added"));
        router.refresh();
        firstFieldRef.current?.focus();
      });
      return;
    }

    // scratch
    const v = name.trim().replace(/\s+/g, " ");
    if (v.length < 2) return setError(errorText("invalid"));
    if (takenInSon.has(v.toLowerCase())) return setError(errorText("duplicate"));
    setError(null);
    start(async () => {
      const r = await addSmetaCommissionProject({
        mode: "scratch",
        sessionNumber,
        name: v,
        info: trimmedInfo || null,
        posterUrl: posterUrl.trim() || null,
      });
      if (!r.ok) return setError(errorText(r.error));
      resetFields();
      toast.success(t("added"));
      router.refresh();
      firstFieldRef.current?.focus();
    });
  }

  function remove(it: SmetaCommissionProject) {
    if (!window.confirm(t("confirmRemove", { name: it.name }))) return;
    start(async () => {
      const r = await removeSmetaCommissionProject(it.id);
      if (!r.ok) return void toast.error(errorText(r.error));
      toast.success(t("removed"));
      router.refresh();
    });
  }

  const modeToggle = (
    <div className="inline-flex items-center gap-1 rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] p-1">
      {(["existing", "scratch"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => switchMode(m)}
          aria-pressed={mode === m}
          className={cn(
            "inline-flex items-center rounded-[9px] px-3 py-1.5 text-[13px] font-semibold transition-colors",
            mode === m ? "bg-[var(--surface)] text-ink shadow-[var(--shadow-1)]" : "text-ink-2 hover:text-ink",
          )}
        >
          {m === "existing" ? t("fromExisting") : t("fromScratch")}
        </button>
      ))}
    </div>
  );

  const addForm = (
    <Card solid className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {modeToggle}
        <button
          type="button"
          onClick={close}
          aria-label={t("close")}
          title={t("close")}
          className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] active:scale-95"
        >
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {/* Son */}
        <div className="flex flex-col gap-1.5 sm:max-w-[9rem]">
          <label className="t-micro font-semibold text-[var(--ink-2)]">{t("sessionLabel")}</label>
          <Input
            type="number"
            min={1}
            inputMode="numeric"
            value={son}
            onChange={(e) => { setSon(e.target.value); if (error) setError(null); }}
            aria-label={t("sessionLabel")}
          />
        </div>

        {mode === "existing" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {picked && (
              <div className="w-16 shrink-0 sm:w-20">
                <Poster url={picked.posterUrl} name={picked.name} />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <label className="t-micro font-semibold text-[var(--ink-2)]">{t("pickProject")}</label>
              <Input
                ref={firstFieldRef}
                value={name}
                onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
                onKeyDown={(e) => { if (e.key === "Escape") close(); }}
                list={listId}
                maxLength={300}
                placeholder={t("pickProject")}
                aria-label={t("pickProject")}
              />
              <datalist id={listId}>
                {suggestions.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
              {picked?.genre && <p className="t-micro text-[var(--ink-3)]">{picked.genre}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="t-micro font-semibold text-[var(--ink-2)]">{t("nameLabel")}</label>
            <Input
              ref={firstFieldRef}
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
              onKeyDown={(e) => { if (e.key === "Escape") close(); }}
              maxLength={300}
              placeholder={t("placeholder")}
              aria-label={t("nameLabel")}
            />
          </div>
        )}

        {/* Maʼlumot — ikkala rejimda ham */}
        <div className="space-y-1.5">
          <label className="t-micro font-semibold text-[var(--ink-2)]">{t("info")}</label>
          <Textarea
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            maxLength={4000}
            placeholder={t("infoPlaceholder")}
            aria-label={t("info")}
            className="min-h-20"
          />
        </div>

        {/* Poster havolasi — faqat "yangidan" (ixtiyoriy) */}
        {mode === "scratch" && (
          <div className="space-y-1.5">
            <label className="t-micro font-semibold text-[var(--ink-2)]">{t("poster")}</label>
            <Input
              type="url"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              maxLength={2000}
              placeholder={t("posterPlaceholder")}
              aria-label={t("poster")}
            />
          </div>
        )}

        {error && <p className="t-small text-[var(--danger)]">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            <Plus className="size-4" />
            {t("add")}
          </Button>
        </div>
      </form>
    </Card>
  );

  const renderRow = (it: SmetaCommissionProject, showSon: boolean) => (
    <Row key={it.id}>
      <div className="flex w-full min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {(it.posterUrl || it.projectId) && (
            <div className="w-12 shrink-0 sm:w-14">
              <Poster url={it.posterUrl} name={it.name} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {it.projectId ? (
              <Link href={`/projects/${it.projectId}`} className="break-words text-[15px] font-semibold leading-snug text-[var(--ink)] hover:text-[var(--tint)] hover:underline">
                {it.name}
              </Link>
            ) : (
              <p className="break-words text-[15px] font-semibold leading-snug text-[var(--ink)]">{it.name}</p>
            )}
            {it.info && <p className="mt-0.5 break-words t-small leading-snug text-[var(--ink-2)]">{it.info}</p>}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 t-micro text-[var(--ink-3)]">
              {showSon && (
                <Status tone="neutral">{it.sessionNumber != null ? t("sonShort", { n: it.sessionNumber }) : t("hozirTag")}</Status>
              )}
              <span>
                {formatDate(it.createdAt, locale)}
                {it.createdByName && `, ${localizeName(it.createdByName, locale)}`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
          <SmetaStatusControl id={it.id} status={it.status} canManage={canManage} />
          {canManage && (
            <button
              type="button"
              onClick={() => remove(it)}
              disabled={pending}
              aria-label={t("remove")}
              title={t("remove")}
              className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--danger)] active:scale-95 disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
    </Row>
  );

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {canAdd && open && addForm}

      {canManage && !ready && (
        <p className="rounded-[var(--radius-m)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--ink-2)]">{t("errors.unavailable")}</p>
      )}

      {/* Real vaqtli qidiruv — barcha sonlardan: qaysi sonda va qachon koʻrilgani topiladi */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-3)]" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="pl-9"
        />
      </div>

      {query.trim() ? (
        matches.length === 0 ? (
          <Card solid bare>
            <p className="py-8 text-center t-small text-[var(--ink-3)]">{t("notFound")}</p>
          </Card>
        ) : (
          <Card solid bare className="px-5 sm:px-6">
            <Rows>{matches.map((it) => renderRow(it, true))}</Rows>
          </Card>
        )
      ) : (
        <Section
          title={t("noSession")}
          action={
            canAdd ? (
              <Button variant={open ? "ghost" : "default"} size="sm" onClick={() => (open ? close() : openForm(null))} aria-expanded={open}>
                {open ? <X className="size-4" /> : <Plus className="size-4" />}
                {open ? t("close") : t("addProject")}
              </Button>
            ) : undefined
          }
        >
          {noSonItems.length === 0 ? (
            <Card solid bare>
              <EmptyState
                icon={FileInvoice}
                title={t("empty")}
                action={
                  canAdd && !open ? (
                    <Button variant="outline" size="sm" onClick={() => openForm(null)}>
                      <Plus className="size-4" />
                      {t("addProject")}
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <Card solid bare className="px-5 sm:px-6">
              <Rows>{noSonItems.map((it) => renderRow(it, false))}</Rows>
            </Card>
          )}
        </Section>
      )}
    </div>
  );
}
