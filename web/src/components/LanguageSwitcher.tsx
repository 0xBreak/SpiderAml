"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

// Locale switch that stays on the same page (path + query are kept).
// next-intl persists the choice in its locale cookie, so unprefixed
// forms and links keep resolving to the chosen locale.
function SwitcherInner() {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const next = locale === "ru" ? "en" : "ru";
  const qs = search.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;
  return (
    <Link
      href={href}
      locale={next}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-2.5 text-[13px] text-silver-2 transition hover:text-silver-1"
      aria-label={next === "en" ? "Switch to English" : "Переключить на русский"}
    >
      <Globe className="size-4" aria-hidden />
      {next.toUpperCase()}
    </Link>
  );
}

export function LanguageSwitcher() {
  return (
    <Suspense>
      <SwitcherInner />
    </Suspense>
  );
}
