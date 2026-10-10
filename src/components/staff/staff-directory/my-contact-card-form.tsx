"use client";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { Card } from "@/components/ui-biib/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveContactCard } from "@/server/actions/contact-card";
import {
  MAX_SKILLS,
  MAX_SKILL_LEN,
  PHONE_RE,
  TELEGRAM_RE,
  normalizeSkill,
  normalizeSkills,
  normalizeTelegram,
} from "./logic";

export type MyContactCardInit = {
  workPhone?: string | null;
  internalExt?: string | null;
  room?: string | null;
  telegramUsername?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  showMobile?: boolean | null;
  /** users.phone — mobil raqam. */
  phone?: string | null;
};

type FieldErrors = { telegram?: string; workPhone?: string; mobile?: string };

/** Sozlamalar sahifasidagi "Mening kontakt kartam" boʻlimi. */
export function MyContactCardForm({ init }: { init: MyContactCardInit }) {
  const t = useTranslations("staffX.staffDirectory");
  const tc = useTranslations("common");
  const router = useRouter();
  const uid = useId();
  const [pending, start] = useTransition();

  const [workPhone, setWorkPhone] = useState(init.workPhone ?? "");
  const [internalExt, setInternalExt] = useState(init.internalExt ?? "");
  const [room, setRoom] = useState(init.room ?? "");
  const [telegram, setTelegram] = useState(init.telegramUsername ?? "");
  const [bio, setBio] = useState(init.bio ?? "");
  const [mobile, setMobile] = useState(init.phone ?? "");
  const [showMobile, setShowMobile] = useState(!!init.showMobile);
  const [skills, setSkills] = useState<string[]>(init.skills ?? []);
  const [skillDraft, setSkillDraft] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const id = (k: string) => `${uid}-${k}`;

  function addSkill() {
    const v = normalizeSkill(skillDraft);
    if (!v) return;
    if (skills.includes(v)) {
      setSkillDraft("");
      return;
    }
    if (skills.length >= MAX_SKILLS) {
      toast.error(t("skillsLimit", { max: MAX_SKILLS }));
      return;
    }
    setSkills([...skills, v.slice(0, MAX_SKILL_LEN)]);
    setSkillDraft("");
  }

  function onSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    } else if (e.key === "Backspace" && !skillDraft && skills.length > 0) {
      setSkills(skills.slice(0, -1));
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const tg = normalizeTelegram(telegram);
    const next: FieldErrors = {};
    if (tg && !TELEGRAM_RE.test(tg)) next.telegram = t("invalidTelegram");
    if (!PHONE_RE.test(workPhone.trim())) next.workPhone = t("invalidPhone");
    if (!PHONE_RE.test(mobile.trim())) next.mobile = t("invalidPhone");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // Enter bosilmay qolgan koʻnikma ham saqlanadi.
    const finalSkills = normalizeSkills(skillDraft.trim() ? [...skills, skillDraft] : skills)
      .map((s) => s.slice(0, MAX_SKILL_LEN))
      .slice(0, MAX_SKILLS);

    start(async () => {
      try {
        const res = await saveContactCard({
          workPhone,
          internalExt,
          room,
          telegramUsername: tg,
          bio,
          skills: finalSkills,
          showMobile,
          mobile,
        });
        if (!res.ok) {
          if (res.error === "invalid_telegram") setErrors({ telegram: t("invalidTelegram") });
          toast.error(
            res.error === "invalid_telegram"
              ? t("invalidTelegram")
              : res.error === "invalid_phone"
                ? t("invalidPhone")
                : tc("error")
          );
          return;
        }
        setTelegram(tg);
        setSkills(finalSkills);
        setSkillDraft("");
        toast.success(t("saved"));
        router.refresh();
      } catch {
        toast.error(tc("error"));
      }
    });
  }

  const errorCls = "t-small font-medium text-[var(--danger)]";

  return (
    <Card solid className="max-w-3xl">
      <div className="mb-5">
        <h2 className="font-[family-name:var(--font-ui)] text-[1.1875rem] font-bold tracking-tight text-[var(--ink)]">
          {t("myCardTitle")}
        </h2>
        <p className="mt-1 t-small text-[var(--ink-3)]">{t("myCardHint")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={id("work")}>{t("workPhone")}</Label>
            <Input
              id={id("work")}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={workPhone}
              onChange={(e) => setWorkPhone(e.target.value)}
              maxLength={50}
              placeholder="+998 71 000 00 00"
              aria-invalid={!!errors.workPhone}
            />
            {errors.workPhone && <p className={errorCls}>{errors.workPhone}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={id("ext")}>{t("internalExt")}</Label>
              <Input
                id={id("ext")}
                inputMode="numeric"
                value={internalExt}
                onChange={(e) => setInternalExt(e.target.value)}
                maxLength={10}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={id("room")}>{t("room")}</Label>
              <Input id={id("room")} value={room} onChange={(e) => setRoom(e.target.value)} maxLength={50} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={id("tg")}>{t("telegram")}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[0.9375rem] font-medium text-[var(--ink-3)]">
                @
              </span>
              <Input
                id={id("tg")}
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                onBlur={() => setTelegram((v) => normalizeTelegram(v))}
                maxLength={64}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={t("telegramPlaceholder")}
                className="pl-8"
                aria-invalid={!!errors.telegram}
              />
            </div>
            {errors.telegram && <p className={errorCls}>{errors.telegram}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={id("mobile")}>{t("mobile")}</Label>
            <Input
              id={id("mobile")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              maxLength={50}
              placeholder="+998 90 000 00 00"
              aria-invalid={!!errors.mobile}
            />
            {errors.mobile && <p className={errorCls}>{errors.mobile}</p>}
          </div>
        </div>

        <label
          htmlFor={id("show")}
          className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-m)] bg-[var(--surface-2)] p-3.5"
        >
          <input
            id={id("show")}
            type="checkbox"
            checked={showMobile}
            onChange={(e) => setShowMobile(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[var(--tint)]"
          />
          <span className="min-w-0">
            <span className="block text-[0.9375rem] font-semibold text-[var(--ink)]">{t("showMobile")}</span>
            <span className="mt-0.5 block t-small text-[var(--ink-3)]">{t("showMobileHint")}</span>
          </span>
        </label>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor={id("bio")}>{t("bio")}</Label>
            <span className="t-micro tabular-nums text-[var(--ink-3)]">{bio.length}/500</span>
          </div>
          <Textarea
            id={id("bio")}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            className="min-h-[88px]"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor={id("skill")}>{t("skills")}</Label>
            <span className="t-micro tabular-nums text-[var(--ink-3)]">
              {skills.length}/{MAX_SKILLS}
            </span>
          </div>
          {skills.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <li
                  key={s}
                  className="inline-flex max-w-full items-center gap-1 rounded-[var(--radius-s)] bg-[var(--surface-2)] py-1 pl-3 pr-1 text-[0.8125rem] font-semibold text-[var(--ink-2)]"
                >
                  <span className="min-w-0 truncate">{s}</span>
                  <button
                    type="button"
                    onClick={() => setSkills(skills.filter((x) => x !== s))}
                    aria-label={t("removeSkill", { skill: s })}
                    title={t("removeSkill", { skill: s })}
                    className="grid size-5 shrink-0 place-items-center rounded-[var(--radius-s)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
                  >
                    <IconX className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Input
            id={id("skill")}
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            onKeyDown={onSkillKeyDown}
            maxLength={MAX_SKILL_LEN}
            placeholder={t("addSkill")}
            disabled={skills.length >= MAX_SKILLS}
            enterKeyHint="done"
          />
          {skills.length >= MAX_SKILLS && (
            <p className="t-small text-[var(--ink-3)]">{t("skillsLimit", { max: MAX_SKILLS })}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            <IconDeviceFloppy className="size-4" />
            {pending ? tc("loading") : tc("save")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
