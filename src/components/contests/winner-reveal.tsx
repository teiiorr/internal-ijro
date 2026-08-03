"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type Rocket = { x: number; y: number; vy: number; targetY: number; color: string };

const COLORS = ["#ffd54a", "#ff5252", "#40c4ff", "#69f0ae", "#e040fb", "#ffab40", "#ffffff"];

/**
 * Full-screen celebratory overlay that reveals a contest winner with a live
 * canvas fireworks show (launching rockets + exploding sparks) and confetti.
 */
export function WinnerReveal({
  contestName,
  winnerName,
  photoUrl,
  onClose,
}: {
  contestName: string;
  winnerName: string;
  photoUrl?: string | null;
  onClose: () => void;
}) {
  const t = useTranslations();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fireworks engine.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let running = true;
    let raf = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
    };
    resize();
    window.addEventListener("resize", resize);

    const parts: Particle[] = [];
    const rockets: Rocket[] = [];
    const rand = () => Math.random();
    const pick = () => COLORS[(rand() * COLORS.length) | 0];

    const launch = () => {
      rockets.push({
        x: (0.12 + rand() * 0.76) * canvas.width,
        y: canvas.height,
        vy: -(9 + rand() * 3.5) * DPR,
        targetY: (0.18 + rand() * 0.35) * canvas.height,
        color: pick(),
      });
    };
    const explode = (x: number, y: number, color: string) => {
      const n = 42 + ((rand() * 34) | 0);
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + rand() * 0.35;
        const sp = (2 + rand() * 4.2) * DPR;
        parts.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0,
          max: 46 + ((rand() * 34) | 0),
          color: rand() < 0.2 ? "#ffffff" : color,
          size: (1.4 + rand() * 1.6) * DPR,
        });
      }
    };

    let frame = 0;
    const tick = () => {
      if (!running) return;
      frame++;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(6,8,20,0.22)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";

      if (frame % 13 === 0) launch();

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy;
        r.vy += 0.06 * DPR;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2 * DPR, 0, 7);
        ctx.fill();
        if (r.vy >= 0 || r.y <= r.targetY) {
          explode(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05 * DPR;
        p.vx *= 0.99;
        p.vy *= 0.99;
        const alpha = 1 - p.life / p.max;
        if (alpha <= 0) {
          parts.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    for (let i = 0; i < 6; i++) window.setTimeout(launch, i * 110);
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#060814]/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      {/* Falling confetti (CSS) on top of the fireworks. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="contest-confetti"
            style={{
              left: `${(i * 37) % 100}%`,
              background: COLORS[i % COLORS.length],
              animationDelay: `${(i % 10) * 0.25}s`,
              animationDuration: `${2.6 + (i % 5) * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div
        className="contest-reveal-card relative mx-auto w-full max-w-md rounded-[28px] border border-white/15 bg-white/[0.06] p-8 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20"
        >
          <X className="size-4" />
        </button>

        <div className="mx-auto mb-4 grid size-20 animate-bounce place-items-center rounded-full bg-gradient-to-br from-[#ffe17a] to-[#c9982a] text-4xl shadow-[0_10px_30px_-6px_rgba(201,152,42,0.7)]">
          🏆
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#ffd54a]">{t("tanlov.winner")}</p>

        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={winnerName} className="mx-auto my-4 size-28 rounded-2xl object-cover shadow-lg ring-4 ring-[#ffd54a]/40" />
        )}

        <h2 className="godfather-title mx-auto mt-3 break-words text-4xl leading-tight sm:text-5xl">{winnerName}</h2>
        <p className="mt-3 text-sm font-medium text-white/70">{contestName}</p>

        <button
          onClick={onClose}
          className="mt-7 rounded-2xl bg-white/10 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
        >
          {t("tanlov.celebrateDone")}
        </button>
      </div>
    </div>
  );
}
