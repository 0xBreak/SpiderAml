import { Menu, Search, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "./Logo";
import { NavDesktop, NavMobile, type NavGroup } from "./NavMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { hasPosts } from "@/lib/blog";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const NAV = [
  { href: "/", key: "home" },
  { href: "/check", key: "check" },
  { href: "/token", key: "token" },
  { href: "/whales", key: "whales" },
  { href: "/sanctions", key: "sanctions" },
  { href: "/frozen", key: "frozen" },
  { href: "/send", key: "send" },
  { href: "/report", key: "report" },
  { href: "/blog", key: "blog" },
  { href: "/services", key: "services" },
] as const;

/** Menu items: the blog link appears once there is a published article. */
export async function visibleNav() {
  const posts = await hasPosts();
  return NAV.filter((n) => n.href !== "/blog" || posts);
}

/**
 * The header menu: a few links and two drop-down groups instead of one long row (the footer still lists every page).
 * Tools: token, whales, send; Databases: sanctions, frozen, report; Services is the call to action at the right end.
 */
export async function headerGroups(t: (k: string) => string): Promise<NavGroup[]> {
  const posts = await hasPosts();
  return [
    { label: t("check"), href: "/check" },
    { label: t("tools"), items: [{ href: "/token", label: t("token") }, { href: "/whales", label: t("whales") }, { href: "/send", label: t("send") }] },
    { label: t("data"), items: [{ href: "/sanctions", label: t("sanctions") }, { href: "/frozen", label: t("frozen") }, { href: "/report", label: t("report") }] },
    ...(posts ? [{ label: t("blog"), href: "/blog" }] : []),
    { label: t("services"), href: "/services", accent: true },
  ];
}

/** One row: logo, menu, language, "check" button. Below 1024px the menu folds into a drop-down (plain <details>, no JS needed to open it). */
export async function Header({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Nav" });
  const groups = await headerGroups((k) => t(k as never));
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-page items-center gap-6 px-4">
        <Logo />
        <div className="hidden lg:block">
          <NavDesktop groups={groups} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/check" className="btn-primary hidden h-9 px-4 text-[13px] sm:inline-flex">
            <Search className="size-4" aria-hidden /> {t("checkCta")}
          </Link>
          <details className="group relative lg:hidden">
            <summary
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-line text-silver-2 hover:text-silver-1 [&::-webkit-details-marker]:hidden"
              aria-label={t("menu")}
            >
              <Menu className="size-5 group-open:hidden" aria-hidden />
              <X className="hidden size-5 group-open:block" aria-hidden />
            </summary>
            <div className="absolute right-0 top-11 max-h-[80vh] w-64 overflow-y-auto rounded-lg border border-line bg-surface p-2 shadow-2xl">
              <NavMobile groups={groups} />
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
