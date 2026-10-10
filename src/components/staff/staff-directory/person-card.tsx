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
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { type PersonLite, type PersonRow } from "./logic";

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
      <Icon className="size-4 shrink-0 text-[var(--subtle)]" aria-hidden />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

const LINK = "font-medium text-[var(--foreground)] underline-offset-2 hover:text-[var(--primary)] hover:underline";

/** Maʼlumotnomadagi toʻliq xodim kartasi. */
export function PersonCard({ person }: { person: PersonRow }) {
  const t = useTranslations("staffX.staffDirectory");
  const tr = useTranslations();
  const locale = useLocale();
  const name = localizeName(person.fullName, locale);
  const title = person.positionTitle ?? tr(`positions.${person.position}`);


  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4 sm:p-5 print:break-inside-avoid print:bg-transparent print:shadow-none print:backdrop-blur-none">
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
            className="block break-words text-[15px] font-semibold leading-snug transition-colors hover:text-[var(--primary)]"
          >
            {name}
          </Link>
          <p className="mt-0.5 break-words text-xs font-medium text-[var(--muted)]">{title}</p>
          {person.departmentName && (
            <p className="mt-0.5 truncate text-xs text-[var(--subtle)]" title={person.departmentName}>
              {person.departmentName}
            </p>
          )}
        </div>
        <a
          href={`/api/export/vcard/${person.id}`}
          download
          title={t("vcard")}
          aria-label={t("vcard")}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] print:hidden"
        >
          <IconAddressBook className="size-[18px]" />
        </a>
      </div>


      <ul className="space-y-1.5 text-sm">
        {person.workPhone && (
          <ContactRow icon={IconPhone} label={t("workPhone")}>
            <a href={telHref(person.workPhone)} className={cn(LINK, "tabular")}>
              {person.workPhone}
            </a>
          </ContactRow>
        )}
        {person.internalExt && (
          <ContactRow icon={IconHash} label={t("internalExt")}>
            <span className="text-[var(--muted)]">{t("internalExt")}:</span>{" "}
            <span className="font-medium tabular">{person.internalExt}</span>
          </ContactRow>
        )}
        {person.room && (
          <ContactRow icon={IconDoor} label={t("room")}>
            <span className="text-[var(--muted)]">{t("room")}:</span> <span className="font-medium">{person.room}</span>
          </ContactRow>
        )}
        {person.mobile && (
          <ContactRow icon={IconDeviceMobile} label={t("mobile")}>
            <a href={telHref(person.mobile)} className={cn(LINK, "tabular")}>
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

      {person.bio && <p className="line-clamp-3 break-words text-sm text-[var(--muted)]">{person.bio}</p>}

      {person.managerName && (
        <p className="flex min-w-0 items-center gap-2 text-xs font-medium text-[var(--muted)]">
          <IconUserUp className="size-4 shrink-0 text-[var(--subtle)]" aria-hidden />
          <span className="min-w-0 truncate">{t("managerLine", { name: localizeName(person.managerName, locale) })}</span>
        </p>
      )}

      {person.skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("skills")}>
          {person.skills.map((s) => (
            <li
              key={s}
              className="max-w-full truncate rounded-md bg-[var(--primary-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--primary)]"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Daraxt ichidagi ixcham xodim kartasi (avatar, ism, lavozim, "bugun yoʻq" belgisi). */
export function PersonCardCompact({
  person,
  size = "sm",
  className,
}: {
  person: PersonLite;
  size?: "sm" | "md";
  className?: string;
}) {
  const tr = useTranslations();
  const locale = useLocale();
  const name = localizeName(person.fullName, locale);
  const title = person.positionTitle ?? tr(`positions.${person.position}`);

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5 print:break-inside-avoid print:bg-transparent",
        className
      )}
    >
      <UserAvatar name={name} avatarUrl={person.avatarUrl} size={size} position={title} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/employees/${person.id}`}
          className="block truncate text-sm font-semibold transition-colors hover:text-[var(--primary)]"
          title={name}
        >
          {name}
        </Link>
        <p className="truncate text-xs text-[var(--muted)]" title={title}>
          {title}
        </p>
      </div>
    </div>
  );
}
