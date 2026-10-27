// Formatting helpers. Russian by default, English when a locale is passed.
// Compact where numbers get big.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale } from "@/i18n/routing";

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

const usdFmt: Record<Locale, Intl.NumberFormat> = {
  ru: new Intl.NumberFormat("ru-RU", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
};
const usdCompact: Record<Locale, Intl.NumberFormat> = {
  ru: new Intl.NumberFormat("ru-RU", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }),
  en: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }),
};
const numCompact: Record<Locale, Intl.NumberFormat> = {
  ru: new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }),
};
const plainNum: Record<Locale, Intl.NumberFormat> = {
  ru: new Intl.NumberFormat("ru-RU"),
  en: new Intl.NumberFormat("en-US"),
};

export function usd(v: number | null | undefined, compact = true, locale: Locale = "ru"): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) < 0.5) return usdFmt[locale].format(0);
  return compact && Math.abs(v) >= 10_000 ? usdCompact[locale].format(v) : usdFmt[locale].format(v);
}

/** Token price: keeps significant digits for tiny prices (memecoins). */
export function price(v: number | null | undefined, locale: Locale = "ru"): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v < 1 ? `$${v.toPrecision(3)}` : usdFmt[locale].format(v);
}

export const num = (v: number | null | undefined, locale: Locale = "ru") => (v == null || !Number.isFinite(v) ? "—" : numCompact[locale].format(v));
export const plain = (v: number | null | undefined, locale: Locale = "ru") => (v == null || !Number.isFinite(v) ? "—" : plainNum[locale].format(v));
export const pct = (v: number | null | undefined, digits = 1) => (v == null || !Number.isFinite(v) ? "—" : `${v.toFixed(digits)}%`);

export const short = (a: string, head = 6, tail = 4) => (a.length > head + tail + 1 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a);

const dateFmt: Record<Locale, Intl.DateTimeFormat> = {
  ru: new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }),
  en: new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }),
};
const dateTimeFmt: Record<Locale, Intl.DateTimeFormat> = {
  ru: new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
  en: new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
};
export const date = (t: number | string | null | undefined, locale: Locale = "ru") => (t ? dateFmt[locale].format(new Date(t)) : "—");
export const dateTime = (t: number | string | null | undefined, locale: Locale = "ru") => (t ? dateTimeFmt[locale].format(new Date(t)) : "—");
