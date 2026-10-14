/**
 * Minimal, dependency-free error reporting.
 *
 * `reportError` ALWAYS writes a structured one-line JSON record to the server
 * console and, when `ERROR_REPORT_URL` is set, additionally fires a best-effort
 * POST of that same record. It never throws and never blocks the caller.
 *
 * Deliberately has NO "use client" and NO "server-only" pragma so the very same
 * helper can be imported from React Server Components, route handlers, the
 * standalone worker, and the client error boundaries. All access to `process`
 * and `fetch` is guarded, so importing it into a client bundle is safe (on the
 * client `ERROR_REPORT_URL` is simply undefined and no POST is attempted).
 *
 * To actually ship the reports somewhere, set `ERROR_REPORT_URL` to a collector
 * that accepts a JSON body — e.g. a Sentry "store"/tunnel endpoint built from a
 * DSN, a Logtail/BetterStack source URL, or any plain webhook receiver. Leaving
 * it unset keeps the console log and skips the network call entirely.
 */

/** The structured record shape that is logged and (optionally) POSTed. */
export type ErrorReport = {
  level: "error";
  message: string;
  stack?: string;
  digest?: string;
  ts: string;
  [key: string]: unknown;
};

/** Read an env var without assuming `process` exists (client bundles). */
function readEnv(name: string): string | undefined {
  try {
    if (typeof process !== "undefined" && process.env) {
      const v = process.env[name];
      return typeof v === "string" && v.length > 0 ? v : undefined;
    }
  } catch {
    // Accessing `process` can throw in exotic runtimes — stay silent.
  }
  return undefined;
}

/** Coerce anything thrown into a stable { message, stack?, digest? } shape. */
function normalizeError(error: unknown): { message: string; stack?: string; digest?: string } {
  if (error instanceof Error) {
    const digest = (error as { digest?: unknown }).digest;
    return {
      message: error.message || error.name || "Error",
      stack: error.stack,
      digest: typeof digest === "string" ? digest : undefined,
    };
  }
  if (typeof error === "string") return { message: error };
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

/**
 * Report an error. Always logs a structured JSON line; optionally fire-and-forget
 * POSTs it to `ERROR_REPORT_URL`. Safe to call from anywhere; never throws.
 *
 * @param error   the thrown value (Error or otherwise)
 * @param context extra fields merged into the record (e.g. { boundary, userId })
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const { message, stack, digest } = normalizeError(error);

  const record: ErrorReport = {
    level: "error",
    message,
    stack,
    digest,
    ...context,
    ts: new Date().toISOString(),
  };

  // 1) Always: one structured line on the server/browser console.
  try {
    console.error(JSON.stringify(record));
  } catch {
    // Last resort if the record is somehow unserializable.
    console.error("reportError", message);
  }

  // 2) Optional: best-effort POST. Never awaited, never throws, never blocks.
  const url = readEnv("ERROR_REPORT_URL");
  if (url && typeof fetch === "function") {
    try {
      void fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(record),
        // Let the request outlive a navigation/unload when sent from the client.
        keepalive: true,
      }).catch(() => {
        // Swallow network errors — reporting must never surface to the user.
      });
    } catch {
      // `fetch` itself can throw synchronously on malformed input — ignore.
    }
  }
}

/**
 * Tiny correlation-id helper (optional). Stamp this onto `context.rid` when you
 * want to tie a logged error back to a request/trace. Falls back to a cheap
 * random string where `crypto.randomUUID` is unavailable.
 */
export function newCorrelationId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore and fall through to the manual path
  }
  return `rid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
