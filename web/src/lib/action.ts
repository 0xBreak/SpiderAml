// Shared foundation for Server Actions: one result envelope and pure helpers.
// Importable from anywhere (server AND client components). Server-only bits
// (rate limit, DataError mapping) live in `./action-server`.
//
// ── Result template ──────────────────────────────────────────────
// Every action returns ActionResult<T>:
//   success → { ok: true, ...data }      via ok(data)
//   failure → { ok: false, error, code } via fail(message, code?) / failCode(code)
// `error` is ALWAYS a user-ready Russian string, `code` is the machine key.
// Clients render `error` directly; use `code` only for branching/i18n.
//
// ── Template 1: query action ("use server") ──────────────────────
//   import { failCode, isEvmAddress, ok, type ActionResult } from "@/lib/action";
//   import { checkLimit, failFrom } from "@/lib/action-server";
//
//   export type MyResult = ActionResult<{ value: string }>;
//
//   export async function myAction(input: string): Promise<MyResult> {
//     if (!isEvmAddress(input)) return failCode("INVALID_ADDRESS");
//     const limited = await checkLimit("my-bucket", 30);
//     if (limited) return limited;
//     try {
//       const r = await getSomething(input);
//       trackEvent("my_event", r.kind, "/my-page");
//       return ok({ value: r.value });
//     } catch (e) {
//       return failFrom(e);
//     }
//   }
//
// ── Template 2: form action for useActionState ───────────────────
//   import { fail, formString, honeypotHit, ok, type ActionResult } from "@/lib/action";
//
//   export type MyFormState = ActionResult<{ id: number }>;
//   // usage: useActionState<MyFormState | null, FormData>(myFormAction, null)
//
//   export async function myFormAction(_prev: MyFormState | null, form: FormData): Promise<MyFormState> {
//     if (honeypotHit(form)) return ok({}); // bots get a fake success, no data
//     const name = formString(form, "name");
//     if (!name) return fail(ERROR_TEXT.REQUIRED, "REQUIRED");
//     ...
//   }
import { ERROR_TEXT } from "./texts";

// ─── envelope ─────────────────────────────────────────────────────

export interface ActionFail {
  ok: false;
  /** User-ready message (Russian). Render it directly. */
  error: string;
  /** Machine key (e.g. "RATE_LIMITED"). For branching, logging, i18n. */
  code?: string;
}

export type ActionOk<T extends object = Record<string, never>> = { ok: true } & T;

export type ActionResult<T extends object = Record<string, never>> = ActionOk<T> | ActionFail;

/** State shape for useActionState: null = untouched, otherwise the last result. */
export type FormState<T extends object = Record<string, never>> = ActionResult<T> | null;

/** Success. `ok()` with no data is the honeypot/bot reply. */
export function ok(): ActionOk<Record<string, never>>;
export function ok<T extends object>(data: T): ActionOk<T>;
export function ok<T extends object>(data?: T): ActionOk<T> {
  return { ok: true, ...(data ?? {}) } as ActionOk<T>;
}

/** Failure with a user-ready message and optional machine code. */
export function fail(error: string, code?: string): ActionFail {
  return code === undefined ? { ok: false, error } : { ok: false, error, code };
}

/** Failure by code: message is resolved from ERROR_TEXT, fallback when unknown. */
export function failCode(code: string, fallback: string = ERROR_TEXT.UNAVAILABLE): ActionFail {
  return { ok: false, error: messageFor(code, fallback), code };
}

/** Resolve a machine code to its user-ready text. */
export function messageFor(code: string, fallback: string): string {
  return ERROR_TEXT[code] ?? fallback;
}

export function isOk<T extends object>(r: ActionResult<T>): r is ActionOk<T> {
  return r.ok === true;
}

export function isFail<T extends object>(r: ActionResult<T>): r is ActionFail {
  return r.ok === false;
}

// ─── validators (pure, shared) ────────────────────────────────────

export const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
export const TRON_ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export function isEvmAddress(v: unknown): v is string {
  return typeof v === "string" && EVM_ADDRESS_RE.test(v.trim());
}

export function isTronAddress(v: unknown): v is string {
  return typeof v === "string" && TRON_ADDRESS_RE.test(v.trim());
}

/** EVM (0x…) or Tron (T…) address. */
export function isAnyAddress(v: unknown): v is string {
  return isEvmAddress(v) || isTronAddress(v);
}

export function isHttpsUrl(v: unknown): v is string {
  return typeof v === "string" && /^https:\/\/\S+$/.test(v.trim());
}

// ─── form helpers (pure, shared) ──────────────────────────────────

/** Trimmed string value of a FormData field ("" when missing). */
export function formString(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

/** Hidden honeypot field filled → it's a bot. Reply ok({}) with no data. */
export function honeypotHit(form: FormData, field = "website"): boolean {
  const v = form.get(field);
  if (v === null) return false;
  if (typeof v === "string") return v !== "";
  return true;
}
