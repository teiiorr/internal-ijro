# =============================================================================
# Ichki Ijro — reproducible Linux runtime image for the Next.js 16 app.
#
# WHY THIS EXISTS
#   The old Mac deploy.sh rsynced darwin-arm64 node_modules onto a Linux
#   droplet, which breaks native modules (sharp, esbuild, @parcel/watcher).
#   Building inside this image guarantees every dependency is compiled for
#   linux/amd64 — the droplet's architecture — so there are no "wrong binary"
#   crashes at runtime.
#
# SCOPE
#   This image runs the WEB APP only (Next.js standalone server). The cron
#   worker (scripts/worker.ts) needs src/ + tsconfig.json + tsx (a devDep) and
#   is NOT part of this slim image — run it as a one-shot from the `build`
#   stage (which keeps the full toolchain) or via the systemd timer on the
#   host. See DEPLOY.md › "Worker".
#
# BUILD
#   docker build -t ichki-ijro:latest .
# RUN
#   docker run --rm -p 3000:3000 --env-file .env.production ichki-ijro:latest
#
# Build it on Linux (CI runner or the droplet) — never `docker build` on the
# Mac and expect the Mac's arch unless you pass --platform=linux/amd64.
# =============================================================================

# ---- Base -------------------------------------------------------------------
# Pin a concrete Node 22 minor on Debian bookworm-slim. glibc (not Alpine/musl)
# so sharp's prebuilt binaries load without extra libvips packaging.
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# pnpm ships with Node via corepack; activate it rather than npm-installing it.
RUN corepack enable
WORKDIR /app

# ---- Dependencies -----------------------------------------------------------
# Separate layer so a lockfile-unchanged rebuild reuses the cached install.
# Full install (incl. devDeps) because `next build` needs them.
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# onlyBuiltDependencies in package.json lets pnpm run the native build scripts
# (sharp, esbuild, @swc/core, …) — do NOT pass --ignore-scripts here.
RUN pnpm install --frozen-lockfile

# ---- Build ------------------------------------------------------------------
# Produces .next/standalone (output: "standalone" in next.config.ts), which is a
# self-contained server with only the traced node_modules it actually needs.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# 4 GB heap matches the droplet's build budget (2 GB RAM + 2 GB swap). Next's
# standalone output traces serverExternalPackages (sharp, exceljs, @react-pdf,
# rimraf) into .next/standalone/node_modules automatically.
RUN CI=true NODE_OPTIONS="--max-old-space-size=4096" pnpm build

# ---- Runner (slim) ----------------------------------------------------------
# Only the standalone server + static assets + public/. No source, no devDeps,
# no package manager — smallest attack surface and image size.
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# server.js honours these; bind all interfaces so a container port map works.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# .next/standalone already contains server.js + its traced node_modules.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets and public/ are NOT copied into standalone by Next — add them.
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Container-level liveness. NOTE: /api/health must be added in src/ (see
# DEPLOY.md). Until it exists this probe will report unhealthy — adjust the
# path or remove the HEALTHCHECK if you ship before the route lands.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
