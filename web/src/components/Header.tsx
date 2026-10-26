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

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-page items-center gap-4 px-4 py-2.5">
        <Logo />
      </div>
      <NavLinks items={NAV} />
    </header>
  );
}
