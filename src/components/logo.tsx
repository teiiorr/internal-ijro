import { cn } from "@/lib/utils";

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ichki Ijro"
      className={cn("shrink-0", className)}
    >
      {/* citron pop chip behind */}
      <rect x="6" y="6" width="52" height="52" rx="14" className="fill-[var(--accent)]" />
      {/* ink monogram square offset */}
      <rect x="2" y="2" width="52" height="52" rx="14" className="fill-[var(--primary)]" />
      <g className="fill-[var(--primary-foreground)]">
        {/* "II" serif-style mono */}
        <rect x="10" y="14" width="14" height="3" rx="0.5"/>
        <rect x="15.5" y="17" width="3" height="22"/>
        <rect x="10" y="39" width="14" height="3" rx="0.5"/>
        <rect x="32" y="14" width="14" height="3" rx="0.5"/>
        <rect x="37.5" y="17" width="3" height="22"/>
        <rect x="32" y="39" width="14" height="3" rx="0.5"/>
      </g>
    </svg>
  );
}
