import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// Locale comes from the `[locale]` segment (see `src/proxy.ts`).
// Messages live in `messages/<locale>.json`; the English file mirrors
// the Russian one key-for-key. `src/lib/texts.ts` keeps the typed
// Russian copy for pages that have not been translated yet.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
