import { Menu, Search, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const NAV = [
  { href: "/", key: "home" },
  { href: "/check", key: "check" },
  { href: "/token", key: "token" },
  { href: "/whales", key: "whales" },
  { href: "/sanctions", key: "sanctions" },
  { href: "/send", key: "send" },
  { href: "/report", key: "report" },
  { href: "/blog", key: "blog" },
] as const;

/** One row: logo, sections, language, "check" button. Below 1280px the sections fold into a menu (plain <details>, no JS needed). */
export async function Header({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Nav" });
  const items = NAV.map((n) => ({ href: n.href, label: t(n.key) }));
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-page items-center gap-6 px-4">
        <Logo />
        <div className="hidden xl:block">
          <NavLinks items={items} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/check" className="btn-primary hidden h-9 px-4 text-[13px] sm:inline-flex">
            <Search className="size-4" aria-hidden /> {t("checkCta")}
          </Link>
          <details className="group relative xl:hidden">
            <summary
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-line text-silver-2 hover:text-silver-1 [&::-webkit-details-marker]:hidden"
              aria-label={t("menu")}
            >
              <Menu className="size-5 group-open:hidden" aria-hidden />
              <X className="hidden size-5 group-open:block" aria-hidden />
            </summary>
            <div className="absolute right-0 top-11 w-64 rounded-lg border border-line bg-surface p-2 shadow-2xl">
              <NavLinks items={items} vertical />
              <Link href="/check" className="btn-primary mt-2 h-10 w-full text-[14px] sm:hidden">
                <Search className="size-4" aria-hidden /> {t("checkCta")}
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
