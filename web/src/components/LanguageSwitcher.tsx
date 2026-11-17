"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

// Locale switch that stays on the same page (path + query are kept).
// next-intl persists the choice in its locale cookie, so unprefixed
// forms and links keep resolving to the chosen locale.
/** `articles` maps an article slug to the slug of its translation (null when there is none), so the switch never lands on a missing page. */
function SwitcherInner({ articles }: { articles: Record<string, string | null> }) {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const next = locale === "ru" ? "en" : "ru";
  const qs = search.toString();
  const article = pathname.match(/^\/blog\/([^/]+)$/);
  // an article exists in one language only: go to its translation, or to the blog list when there is none
  const href = article ? (articles[article[1]] ? `/blog/${articles[article[1]]}` : "/blog") : qs ? `${pathname}?${qs}` : pathname;
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

export function LanguageSwitcher({ articles = {} }: { articles?: Record<string, string | null> }) {
  return (
    <Suspense>
      <SwitcherInner articles={articles} />
    </Suspense>
  );
}
