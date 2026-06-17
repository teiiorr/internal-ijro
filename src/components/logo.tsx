import { cn } from "@/lib/utils";

export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ichki Ijro"
      className={cn("rounded-md", className)}
    >
      <rect width="64" height="64" rx="10" className="fill-[var(--primary)]" />
      <g className="fill-[var(--primary-foreground)]">
        <rect x="14" y="18" width="14" height="2.6" />
        <rect x="19.7" y="18" width="2.6" height="28" />
        <rect x="14" y="43.4" width="14" height="2.6" />
        <rect x="36" y="18" width="14" height="2.6" />
        <rect x="41.7" y="18" width="2.6" height="28" />
        <rect x="36" y="43.4" width="14" height="2.6" />
      </g>
    </svg>
  );
}
