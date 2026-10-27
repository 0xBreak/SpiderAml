import { defineRouting } from "next-intl/routing";

// Russian is the default locale and uses no URL prefix (`/check`),
// so every existing link, bookmark and indexed page keeps working.
// English lives under `/en/*` (`/en/check`).
export const routing = defineRouting({
  locales: ["ru", "en"],
  defaultLocale: "ru",
  localePrefix: "as-needed",
  // Redirect `/` to `/en` for browsers with English Accept-Language,
  // remember the choice in the NEXT_LOCALE cookie.
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
export const LOCALES: Locale[] = [...routing.locales];
export const DEFAULT_LOCALE: Locale = routing.defaultLocale;
export const isLocale = (v: string): v is Locale => (routing.locales as readonly string[]).includes(v);
