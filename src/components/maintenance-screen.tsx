"use client";
import { useEffect, useRef } from "react";

const CSS = `
.mnt { position: fixed; inset: 0; z-index: 9999; overflow: hidden;
  background: radial-gradient(120% 90% at 50% 38%, #07241a 0%, #041310 58%, #020a08 100%);
  font-family: "SFMono-Regular", ui-monospace, Menlo, Consolas, "Liberation Mono", monospace;
  color: #27f59b; display: grid; place-items: center; }
.mnt canvas { position: absolute; inset: 0; z-index: 0; display: block; }
.mnt .fx { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
.mnt .vignette { background: radial-gradient(130% 100% at 50% 42%, transparent 42%, rgba(2,8,6,.72) 100%); }
.mnt .scanlines { background: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,0,0,.20) 3px); mix-blend-mode: multiply; opacity: .45; }
.mnt .wrap { position: relative; z-index: 2; width: min(92vw, 640px); padding: 28px; text-align: center; }
.mnt .card { border: 1px solid rgba(39,245,155,.30); border-radius: 16px; background: rgba(4,18,13,.70);
  backdrop-filter: blur(7px) saturate(150%); -webkit-backdrop-filter: blur(7px) saturate(150%);
  box-shadow: 0 0 0 1px rgba(39,245,155,.06), 0 24px 70px rgba(0,0,0,.6), inset 0 0 60px rgba(39,245,155,.05); padding: 34px 26px 30px; }
.mnt .plate { --ch: 6px; display: inline-flex; align-items: center;
  clip-path: polygon(var(--ch) 0, 100% 0, 100% calc(100% - var(--ch)), calc(100% - var(--ch)) 100%, 0 100%, 0 var(--ch));
  background: #27f59b; color: #04120c; font-size: 11px; font-weight: 800; letter-spacing: .20em; text-transform: uppercase;
  padding: 7px 14px; margin-bottom: 22px; box-shadow: 0 0 20px rgba(39,245,155,.35); }
.mnt h1 { font-size: clamp(22px, 6vw, 34px); font-weight: 700; line-height: 1.25; color: #eafff5; letter-spacing: .5px;
  text-shadow: 0 0 18px rgba(39,245,155,.45), 0 0 2px rgba(39,245,155,.9); }
.mnt h1 .cursor { color: #27f59b; animation: mntblink 1s steps(2) infinite; font-weight: 400; }
.mnt p.sub { margin-top: 14px; font-size: clamp(13px, 3.6vw, 16px); color: #27f59b; opacity: .92; }
.mnt .bar { margin: 26px auto 4px; width: min(80%, 340px); height: 3px; border-radius: 3px; background: rgba(39,245,155,.14); overflow: hidden; }
.mnt .bar i { display: block; height: 100%; width: 38%; border-radius: 3px; background: linear-gradient(90deg, transparent, #27f59b, transparent); box-shadow: 0 0 12px #27f59b; animation: mntsweep 1.8s cubic-bezier(.65,0,.35,1) infinite; }
.mnt .meta { margin-top: 18px; font-size: 11px; letter-spacing: .12em; color: #0e9e63; }
@keyframes mntblink { 50% { opacity: 0; } }
@keyframes mntsweep { 0% { transform: translateX(-120%); } 100% { transform: translateX(360%); } }
@media (prefers-reduced-motion: reduce) { .mnt canvas { opacity: .4; } .mnt .cursor, .mnt .bar i { animation: none; } }
`;

const POOL = [
  'import { db } from "@/lib/db";',
  "const stages = await db.select().from(projectStages)",
  '  .where(eq(projectStages.status, "active"));',
  "function recalcProgress(id: string) {",
  "  const done = stages.filter(s => s.completed).length;",
  "  return Math.round((done / stages.length) * 100);",
  "}",
  "SELECT p.name, sum(sp.amount) FILTER (WHERE sp.status='paid')",
  "  FROM projects p JOIN stage_payments sp ON sp.stage_id = ps.id",
  "  GROUP BY p.id ORDER BY p.deadline ASC;",
  'await notify({ type: "stage.accepted", userIds });',
  "export async function getTeamWorkload() { /* ... */ }",
  "systemctl restart markaz-ijro  # redeploying",
  "pnpm build  ✓  compiled in 7.8s",
  "rsync -az .next/ droplet:/opt/markaz-ijro/app/.next/",
  '[worker] stage-reminders → { sent: 12, overdue: 3 }',
  "0x7f3a9c  const token = crypto.randomUUID();",
  "for (const s of studios) scorecard(s.id);",
  'revalidatePath("/dashboard");  // ok',
  "GET /api/search?q=teiior  200  34ms",
  "const ok = isOwner(session.user.email);",
  "migrate 0037_app_settings.sql  ...  ✓",
  "building production bundle ████████░░ 82%",
];

/** Texnik rejim / 502 ekrani — xaker uslubi: kod generatsiyasi foni + burchakli plashka. */
export function MaintenanceScreen() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const x = c.getContext("2d");
    if (!x) return;
    const FS = 14, LH = 20, PAD = 18;
    let lines: string[] = [], cur = "", si = 0, ci = 0, maxLines = 40;
    function resize() {
      c!.width = window.innerWidth; c!.height = window.innerHeight;
      maxLines = Math.max(6, Math.floor((c!.height - PAD) / LH) - 1);
    }
    resize();
    window.addEventListener("resize", resize);
    const id = window.setInterval(() => {
      for (let k = 0; k < 2; k++) {
        const src = POOL[si % POOL.length];
        if (ci < src.length) cur += src.charAt(ci++);
        else { lines.push(cur); cur = ""; ci = 0; si++; if (lines.length > maxLines) lines.shift(); }
      }
      x.clearRect(0, 0, c!.width, c!.height);
      x.font = FS + "px ui-monospace, monospace";
      for (let i = 0; i < lines.length; i++) {
        x.fillStyle = "rgba(39,245,155,0.15)";
        x.fillText(lines[i], PAD, PAD + (i + 1) * LH);
      }
      x.fillStyle = "rgba(39,245,155,0.55)";
      x.fillText(cur, PAD, PAD + (lines.length + 1) * LH);
    }, 42);
    // Tizim qayta ochilganda foydalanuvchi oʻzi qaytib kirsin.
    const reload = window.setTimeout(() => { window.location.href = "/"; }, 12000);
    return () => { window.clearInterval(id); window.clearTimeout(reload); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="mnt">
      <style>{CSS}</style>
      <canvas ref={ref} />
      <div className="fx vignette" />
      <div className="fx scanlines" />
      <div className="wrap">
        <div className="card">
          <span className="plate">Markaz Ijro</span>
          <h1>Texnik ishlar olib borilmoqda<span className="cursor">_</span></h1>
          <p className="sub">Biroz kuting — tizim tez orada qayta ishga tushadi.</p>
          <div className="bar"><i /></div>
          <div className="meta">auto-reconnect…</div>
        </div>
      </div>
    </div>
  );
}
