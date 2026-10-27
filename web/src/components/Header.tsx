import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";

export const NAV = [
  { href: "/", label: "Главная" },
  { href: "/check", label: "AML-проверка" },
  { href: "/token", label: "Анализ токена" },
  { href: "/whales", label: "Киты" },
  { href: "/sanctions", label: "Санкции" },
  { href: "/send", label: "Отправка" },
  { href: "/report", label: "Сообщить" },
  { href: "/blog", label: "Блог" },
];

/** One row: logo, sections, "check" button. Below 1280px the sections fold into a menu (plain <details>, no JS needed). */
export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-page items-center gap-6 px-4">
        <Logo />
        <div className="hidden xl:block">
          <NavLinks items={NAV} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/check" className="btn-primary hidden h-9 px-4 text-[13px] sm:inline-flex">
            <Search className="size-4" aria-hidden /> Проверить адрес
          </Link>
          <details className="group relative xl:hidden">
            <summary
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-line text-silver-2 hover:text-silver-1 [&::-webkit-details-marker]:hidden"
              aria-label="Меню"
            >
              <Menu className="size-5 group-open:hidden" aria-hidden />
              <X className="hidden size-5 group-open:block" aria-hidden />
            </summary>
            <div className="absolute right-0 top-11 w-64 rounded-lg border border-line bg-surface p-2 shadow-2xl">
              <NavLinks items={NAV} vertical />
              <Link href="/check" className="btn-primary mt-2 h-10 w-full text-[14px] sm:hidden">
                <Search className="size-4" aria-hidden /> Проверить адрес
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
