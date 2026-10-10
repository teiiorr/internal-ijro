"use client";
import { useLocale, useTranslations } from "next-intl";
import {
  IconAddressBook,
  IconBrandTelegram,
  IconDeviceMobile,
  IconDoor,
  IconHash,
  IconMail,
  IconPhone,
  IconUserUp,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui-biib/Card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { type PersonRow } from "./logic";

/** tel: havolasi uchun faqat + va raqamlar. */
const telHref = (raw: string) => `tel:${raw.replace(/[^+0-9]/g, "")}`;

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: TablerIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex min-w-0 items-center gap-2" title={label}>
      <Icon className="size-4 shrink-0 text-[var(--ink-3)]" aria-hidden />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

const LINK = "font-medium text-[var(--ink)] underline-offset-2 hover:text-[var(--tint)] hover:underline";

/** Maʼlumotnomadagi toʻliq xodim kartasi. */
export function PersonCard({ person }: { person: PersonRow }) {
  const t = useTranslations("staffX.staffDirectory");
  const tr = useTranslations();
  const locale = useLocale();
  const name = localizeName(person.fullName, locale);
  const title = person.positionTitle ?? tr(`positions.${person.position}`);

  return (
    <Card className="flex min-w-0 flex-col gap-3 print:break-inside-avoid">
      <div className="flex min-w-0 items-start gap-3">
        <UserAvatar
          name={name}
          avatarUrl={person.avatarUrl}
          size="md"
          department={person.departmentName}
          position={title}
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/employees/${person.id}`}
            className="block break-words text-[0.9375rem] font-semibold leading-snug text-[var(--ink)] transition-colors hover:text-[var(--tint)]"
          >
            {name}
          </Link>
          <p className="mt-0.5 break-words t-small text-[var(--ink-2)]">{title}</p>
          {person.departmentName && (
            <p className="mt-0.5 truncate t-small text-[var(--ink-3)]" title={person.departmentName}>
              {person.departmentName}
            </p>
          )}
        </div>
        <a
          href={`/api/export/vcard/${person.id}`}
          download
          title={t("vcard")}
          aria-label={t("vcard")}
          className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-s)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)] print:hidden"
        >
          <IconAddressBook className="size-[18px]" />
        </a>
      </div>

      <ul className="space-y-1.5 t-small text-[var(--ink)]">
        {person.workPhone && (
          <ContactRow icon={IconPhone} label={t("workPhone")}>
            <a href={telHref(person.workPhone)} className={cn(LINK, "tabular-nums")}>
              {person.workPhone}
            </a>
          </ContactRow>
        )}
        {person.internalExt && (
          <ContactRow icon={IconHash} label={t("internalExt")}>
            <span className="text-[var(--ink-3)]">{t("internalExt")}:</span>{" "}
            <span className="font-medium tabular-nums">{person.internalExt}</span>
          </ContactRow>
        )}
        {person.room && (
          <ContactRow icon={IconDoor} label={t("room")}>
            <span className="text-[var(--ink-3)]">{t("room")}:</span> <span className="font-medium">{person.room}</span>
          </ContactRow>
        )}
        {person.mobile && (
          <ContactRow icon={IconDeviceMobile} label={t("mobile")}>
            <a href={telHref(person.mobile)} className={cn(LINK, "tabular-nums")}>
              {person.mobile}
            </a>
          </ContactRow>
        )}
        {person.telegramUsername && (
          <ContactRow icon={IconBrandTelegram} label={t("telegram")}>
            <a
              href={`https://t.me/${person.telegramUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              @{person.telegramUsername}
            </a>
          </ContactRow>
        )}
        <ContactRow icon={IconMail} label={tr("common.email")}>
          <a href={`mailto:${person.email}`} className={LINK}>
            {person.email}
          </a>
        </ContactRow>
      </ul>

      {person.bio && <p className="line-clamp-3 break-words t-small text-[var(--ink-2)]">{person.bio}</p>}

      {person.managerName && (
        <p className="flex min-w-0 items-center gap-2 t-small text-[var(--ink-3)]">
          <IconUserUp className="size-4 shrink-0 text-[var(--ink-3)]" aria-hidden />
          <span className="min-w-0 truncate">{t("managerLine", { name: localizeName(person.managerName, locale) })}</span>
        </p>
      )}

      {person.skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("skills")}>
          {person.skills.map((s) => (
            <li
              key={s}
              className="max-w-full truncate rounded-[var(--radius-s)] bg-[var(--surface-2)] px-2 py-0.5 t-micro text-[var(--ink-2)]"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
