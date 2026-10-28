// Search-engine metadata shared by every page: one canonical URL per page, hreflang pairs that point at the same page
// in the other language (Russian has no prefix, English lives under /en), and noindex for result pages.
import type { Metadata } from "next";

export const SITE = "https://spideraml.com";

/** Absolute URL of a path (`/check`, `/` for home) in a language. */
export const urlOf = (locale: string, path: string) => {
  const p = path === "/" ? "" : path;
  return locale === "en" ? `${SITE}/en${p}` : p ? `${SITE}${p}` : SITE;
};

/**
 * `searchParams` present and non-empty means a result page (an address, a search text, a page number): those are
 * personal queries, not content, so they stay out of the index while the clean tool page is the one that ranks.
 */
export function seo(locale: string, path: string, searchParams?: Record<string, unknown>): Pick<Metadata, "alternates" | "robots"> {
  const query = searchParams && Object.values(searchParams).some((v) => v != null && v !== "");
  return {
    alternates: {
      canonical: urlOf(locale, path),
      languages: { ru: urlOf("ru", path), en: urlOf("en", path), "x-default": urlOf("ru", path) },
    },
    ...(query ? { robots: { index: false, follow: true } } : {}),
  };
}
