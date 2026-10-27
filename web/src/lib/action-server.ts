// Server-only half of the actions foundation: rate limiting and DataError
// mapping. Import from Server Actions only ("use server" files, route
// handlers, server components). Clients import types/pure helpers from
// `@/lib/action` instead — this file throws outside the server.
import "server-only";
import { DataError, limit } from "./data";
import { ERROR_TEXT } from "./texts";
import { fail, type ActionFail } from "./action";

export { fail, failCode, formString, honeypotHit, isAnyAddress, isEvmAddress, isFail, isHttpsUrl, isOk, isTronAddress, messageFor, ok } from "./action";
export type { ActionFail, ActionOk, ActionResult, FormState } from "./action";

/** Machine code of an unknown error (DataError code or "UPSTREAM"). */
export function codeOf(e: unknown, fallback = "UPSTREAM"): string {
  return e instanceof DataError ? e.code : fallback;
}

/**
 * Map a caught error to an ActionFail.
 * DataError → its message (already user-ready Russian from the data layer)
 * with its code; anything else → fallback message with code "UPSTREAM".
 */
export function failFrom(e: unknown, fallback: string = ERROR_TEXT.UNAVAILABLE): ActionFail {
  if (e instanceof DataError) return fail(e.message || ERROR_TEXT[e.code] || fallback, e.code);
  return fail(fallback, "UPSTREAM");
}

/**
 * Per-IP sliding-window limit. Returns null when allowed, an ActionFail
 * ({ ok: false, error, code: "RATE_LIMITED" }) when over budget.
 * Template: `const limited = await checkLimit("bucket", N); if (limited) return limited;`
 */
export async function checkLimit(bucket: string, perMinute: number): Promise<ActionFail | null> {
  try {
    await limit(bucket, perMinute);
    return null;
  } catch (e) {
    return failFrom(e, ERROR_TEXT.RATE_LIMITED);
  }
}
