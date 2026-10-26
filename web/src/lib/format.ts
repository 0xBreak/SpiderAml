// Formatting helpers. Russian locale, compact where numbers get big.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

const usdFmt = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const numCompact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 2 });

export function usd(v: number | null | undefined, compact = true): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) < 0.5) return usdFmt.format(0);
  return compact && Math.abs(v) >= 10_000 ? usdCompact.format(v) : usdFmt.format(v);
}

/** Token price: keeps significant digits for tiny prices (memecoins). */
export function price(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v < 1 ? `$${v.toPrecision(3)}` : usdFmt.format(v);
}

export const num = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? "—" : numCompact.format(v));
export const pct = (v: number | null | undefined, digits = 1) => (v == null || !Number.isFinite(v) ? "—" : `${v.toFixed(digits)}%`);

export const short = (a: string, head = 6, tail = 4) => (a.length > head + tail + 1 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a);

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const date = (t: number | string | null | undefined) => (t ? dateFmt.format(new Date(t)) : "—");
export const dateTime = (t: number | string | null | undefined) => (t ? dateTimeFmt.format(new Date(t)) : "—");
