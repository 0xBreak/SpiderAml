// Which language a first-time visitor gets: Russian for Russian-reading regions, English for everyone else.
// Pure functions (no Next.js imports) so the proxy and tests can use them.
import type { Locale } from "./routing";

/** Languages whose speakers usually read Russian more easily than English (CIS and the region). */
const RUSSIAN_READERS = new Set(["ru", "uk", "be", "kk", "ky", "uz", "tg", "tk", "az", "hy", "ka", "mo"]);

/**
 * First language in an Accept-Language header that we can serve, honouring the visitor's own order.
 * No header at all (crawlers, scripts) → the site's default, Russian.
 */
export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  const langs = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().toLowerCase().split(";q=");
      return { tag, q: q ? Number(q) : 1 };
    })
    .filter((x) => x.tag && x.tag !== "*")
    .sort((a, b) => b.q - a.q);
  if (langs.length === 0) return "ru";
  for (const { tag } of langs) {
    if (tag.startsWith("en")) return "en";
    if (RUSSIAN_READERS.has(tag.split("-")[0])) return "ru";
  }
  return "en";
}
