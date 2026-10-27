// Address search. A plain GET form, so it works without JavaScript and every result has a shareable URL.
import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { NETWORK_IDS, NETWORKS } from "@/lib/networks";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/format";

interface Props {
  action: "/check" | "/token" | "/whales";
  address?: string;
  network?: string;
  placeholder?: string;
  button?: string;
  size?: "md" | "lg";
  /** Explicit locale from route params. When set, translations resolve
      without touching request headers, so the route can prerender statically.
      Dynamic pages omit it and fall back to the ambient request locale. */
  locale?: Locale;
  /** extra controls rendered before the button (e.g. whale threshold) */
  children?: React.ReactNode;
}

export async function SearchForm({ action, address, network = "ethereum", placeholder, button, size = "md", locale, children }: Props) {
  const resolved = locale ?? ((await getLocale()) as Locale);
  const t = locale ? await getTranslations({ locale, namespace: "Common" }) : await getTranslations("Common");
  // With `localePrefix: as-needed` the default locale has no prefix;
  // other locales are prefixed so the form stays in the current language.
  const localizedAction = resolved === DEFAULT_LOCALE ? action : (`/${resolved}${action}` as const);
  return (
    <form action={localizedAction} method="get" className={cn("flex w-full flex-col gap-2 sm:flex-row", size === "lg" && "sm:gap-3")} role="search">
      <label className="relative flex-1">
        <span className="sr-only">{t("addressSr")}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-silver-3" aria-hidden />
        <input
          name="address"
          defaultValue={address}
          required
          maxLength={100}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder ?? t("searchPlaceholder")}
          className={cn("input pl-9 font-mono", size === "lg" && "h-12 text-[15px]")}
        />
      </label>
      <label className="sm:w-44">
        <span className="sr-only">{t("networkSr")}</span>
        <select name="network" defaultValue={network} className={cn("input", size === "lg" && "h-12")}>
          {NETWORK_IDS.map((id) => (
            <option key={id} value={id}>
              {NETWORKS[id].label}
            </option>
          ))}
          {/* Tron is screened by the AML check only (lists and databases, no token analytics) */}
          {action === "/check" && <option value="tron">Tron</option>}
        </select>
      </label>
      {children}
      <button type="submit" className={cn("btn-primary", size === "lg" && "h-12 px-6")}>
        {button ?? t("searchButton")}
      </button>
    </form>
  );
}
