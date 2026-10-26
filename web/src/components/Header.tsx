import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { NETWORK_IDS, NETWORKS } from "@/lib/networks";
import { Search } from "lucide-react";

export const NAV = [
  { href: "/check", label: "Проверка адреса" },
  { href: "/aml", label: "AML-анализ" },
  { href: "/whales", label: "Киты" },
  { href: "/sanctions", label: "Санкции" },
  { href: "/send", label: "Отправка" },
  { href: "/blog", label: "Блог" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-page items-center gap-4 px-4 py-2.5">
        <Logo />
        <form action="/check" method="get" role="search" className="ml-auto hidden flex-1 items-center gap-2 md:flex lg:max-w-xl">
          <label className="relative flex-1">
            <span className="sr-only">Адрес</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-silver-3" aria-hidden />
            <input name="address" required maxLength={100} autoComplete="off" spellCheck={false} placeholder="Проверить адрес 0x… / T…" className="input h-9 pl-8 font-mono text-[13px]" />
          </label>
          <select name="network" defaultValue="ethereum" className="input h-9 w-36 text-[13px]" aria-label="Сеть">
            {NETWORK_IDS.map((id) => (
              <option key={id} value={id}>
                {NETWORKS[id].label}
              </option>
            ))}
          </select>
        </form>
      </div>
      <NavLinks items={NAV} />
    </header>
  );
}
