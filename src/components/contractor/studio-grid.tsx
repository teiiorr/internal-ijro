"use client";
import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconSearch, IconFolder, IconChevronRight } from "@tabler/icons-react";
import { SmoothImage } from "@/components/ui/smooth-image";
import { Badge } from "@/components/ui/badge";

type Proj = { id: string; name: string; status: string };
type Studio = {
  id: string;
  name: string;
  contactPerson: string | null;
  contactEmail: string | null;
  status: string;
  rating: string | null;
  logoUrl: string | null;
  projects: Proj[];
};

const initial = (name: string) =>
  name.replace(/["'«»“”]/g, "").trim().charAt(0).toUpperCase() || "?";

const COLORS = [
  "from-indigo-500/20 to-purple-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-amber-500/20 to-orange-500/20",
  "from-rose-500/20 to-pink-500/20",
  "from-sky-500/20 to-cyan-500/20",
  "from-violet-500/20 to-fuchsia-500/20",
];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

export function StudioGrid({ studios }: { studios: Studio[] }) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return studios;
    return studios.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.contactPerson?.toLowerCase().includes(q) ||
        s.projects.some((p) => p.name.toLowerCase().includes(q)),
    );
  }, [query, studios]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-[var(--muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.search") + "..."}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-11 pr-4 text-sm font-medium placeholder:text-[var(--subtle)] transition-all duration-300 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-glow)] focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            &times;
          </button>
        )}
      </div>

      {/* Results count */}
      {query && (
        <p className="text-sm text-[var(--muted)] animate-[item-enter_0.3s_ease_both]">
          {filtered.length === 0
            ? t("contractors.none")
            : `${filtered.length} ${t("contractors.projectsCount", { n: filtered.length }).split(" ").slice(-1)}`}
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-20 text-[var(--muted)]">
          <IconSearch className="size-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">{t("contractors.none")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 stagger-children">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/contractors/${s.id}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-1)] transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow-2)]"
            >
              {/* Hero area — gradient or logo */}
              <div className={`relative h-32 bg-gradient-to-br ${colorFor(s.id)} overflow-hidden transition-all duration-500`}>
                {s.logoUrl ? (
                  <SmoothImage
                    src={s.logoUrl}
                    alt={s.name}
                    className="size-full object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <span className="select-none text-6xl font-black text-[var(--foreground)] opacity-15 transition-all duration-500 group-hover:scale-110 group-hover:opacity-20">
                      {initial(s.name)}
                    </span>
                  </div>
                )}

                {/* Status badge overlay */}
                {s.status !== "approved" && (
                  <div className="absolute right-2.5 top-2.5">
                    <Badge variant={s.status === "rejected" ? "danger" : "warning"}>
                      {t(`status.${s.status}` as "status.pending")}
                    </Badge>
                  </div>
                )}
                {s.rating && (
                  <div className="absolute left-2.5 top-2.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-black/30 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                      ⭐ {s.rating}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-4 pt-3.5">
                <h3 className="text-base font-bold leading-snug line-clamp-2 transition-colors duration-300 group-hover:text-[var(--primary)]">
                  {s.name}
                </h3>

                {s.contactPerson && (
                  <p className="mt-1 text-xs text-[var(--muted)] truncate">{s.contactPerson}</p>
                )}

                {/* Projects preview */}
                <div className="mt-auto pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)]">
                    <IconFolder className="size-3.5" />
                    <span>{t("contractors.projectsCount", { n: s.projects.length })}</span>
                  </div>
                  {s.projects.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {s.projects.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-xs transition-colors duration-300 group-hover:bg-[var(--surface-3)]"
                        >
                          <span className="truncate font-medium">{p.name}</span>
                          <Badge
                            variant={p.status === "completed" ? "success" : "secondary"}
                            className="shrink-0 text-[10px]"
                          >
                            {t(`status.${p.status}` as "status.planning")}
                          </Badge>
                        </div>
                      ))}
                      {s.projects.length > 3 && (
                        <p className="text-center text-[10px] font-medium text-[var(--muted)]">
                          +{s.projects.length - 3}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom accent bar */}
              <div className="flex items-center justify-end border-t border-[var(--border)] px-4 py-2.5 transition-colors duration-300 group-hover:border-[var(--primary)]/20 group-hover:bg-[var(--primary-soft)]">
                <span className="flex items-center gap-1 text-xs font-semibold text-[var(--muted)] transition-all duration-300 group-hover:text-[var(--primary)] group-hover:translate-x-0.5">
                  {t("common.open")}
                  <IconChevronRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
