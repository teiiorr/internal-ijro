"use client";
import Link from "next/link";
import { UserAvatar } from "./user-avatar";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

/** Avatar size mapping — UserAvatar sizes: sm=40px, md=48px, lg=64px. */
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
  /** Display-ready name (localize at the call site via localizeName). */
  name: string;
  avatarUrl?: string | null;
  position?: string | null;
  department?: string | null;
  /** Overrides the auto-built "position · department" subtitle. */
  subtitle?: string | null;
  size?: Size;
  /** Wraps the whole identity in a Link (avatar lightbox is disabled then). */
  href?: string;
  className?: string;
  /** Stack name under avatar (centered), for large card contexts. */
  stacked?: boolean;
}

/**
 * The single source of truth for rendering a person (avatar + name [+ role]).
 * Avatar and name read as one unit. Use everywhere a staff member appears.
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
