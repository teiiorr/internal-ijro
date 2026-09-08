"use client";
import Link from "next/link";
import { UserAvatar } from "./user-avatar";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

/** Avatar ölçamlari mosligi — UserAvatar ölçamlari: sm=40px, md=48px, lg=64px. */
const AVATAR_SIZE: Record<Size, "sm" | "md" | "lg"> = { sm: "sm", md: "md", lg: "lg" };
const NAME_CLS: Record<Size, string> = {
  sm: "text-sm font-semibold",
  md: "text-[15px] font-semibold",
  lg: "text-lg font-bold tracking-tight",
};
const SUB_CLS: Record<Size, string> = {
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-[13px]",
};
const GAP: Record<Size, string> = { sm: "gap-2.5", md: "gap-3", lg: "gap-3.5" };

interface EmployeeIdentityProps {
  /** Körsatişga tayyor ism (çaqiruv joyida localizeName orqali lokalizatsiya qilinadi). */
  name: string;
  avatarUrl?: string | null;
  position?: string | null;
  department?: string | null;
  /** Avtomatik yiğilgan "position · department" subtitrini almaştiradi. */
  subtitle?: string | null;
  size?: Size;
  /** Butun identity'ni Link içiga öraydi (bu holda avatar lightbox öçiriladi). */
  href?: string;
  className?: string;
  /** Ismni avatar ostiga joylaştiradi (markazda), katta karta holatlari uçun. */
  stacked?: boolean;
}

/**
 * Şaxsni (avatar + ism [+ lavozim]) çiziş uçun yagona haqiqat manbai.
 * Avatar va ism yaxlit bir butun sifatida körinadi. Xodim körinadigan har
 * qanday joyda foydalaning.
 */
export function EmployeeIdentity({
  name,
  avatarUrl,
  position,
  department,
  subtitle,
  size = "md",
  href,
  className,
  stacked = false,
}: EmployeeIdentityProps) {
  const sub = subtitle ?? ([position, department].filter(Boolean).join(" · ") || null);

  if (stacked) {
    const inner = (
      <div className={cn("flex flex-col items-center text-center min-w-0", className)}>
        <UserAvatar
          name={name}
          avatarUrl={avatarUrl}
          size={size === "sm" ? "md" : "lg"}
          department={department}
          position={position}
          clickable={!href}
        />
        <p className={cn("mt-2 max-w-full truncate leading-tight", NAME_CLS[size])}>{name}</p>
        {sub && <p className={cn("mt-0.5 max-w-full truncate text-[var(--muted)] leading-tight", SUB_CLS[size])}>{sub}</p>}
      </div>
    );
    return href ? (
      <Link href={href} className="block transition-opacity hover:opacity-80">{inner}</Link>
    ) : inner;
  }

  const inner = (
    <div className={cn("flex items-center min-w-0", GAP[size], className)}>
      <UserAvatar
        name={name}
        avatarUrl={avatarUrl}
        size={AVATAR_SIZE[size]}
        department={department}
        position={position}
        clickable={!href}
      />
      <div className="min-w-0">
        <p className={cn("truncate leading-tight", NAME_CLS[size])}>{name}</p>
        {sub && <p className={cn("mt-0.5 truncate text-[var(--muted)] leading-tight", SUB_CLS[size])}>{sub}</p>}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block min-w-0 transition-opacity hover:opacity-80">{inner}</Link>
  ) : inner;
}
