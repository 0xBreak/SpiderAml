import Link from "next/link";
import { Mail, Send } from "lucide-react";
import { DISCLAIMER } from "@/lib/texts";
import { Logo } from "./Logo";
import { NAV } from "./Header";

// Contacts are shown only when configured (build args in docker-compose), so a dead address never reaches the site.
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
const TELEGRAM = process.env.NEXT_PUBLIC_TELEGRAM?.trim().replace(/^@/, "");

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto grid max-w-page gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-silver-3">{DISCLAIMER}</p>
        </div>

        <div>
          <div className="label mb-3">Разделы</div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {NAV.filter((n) => n.href !== "/").map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-silver-2 hover:text-silver-1">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="label mb-3">Связь</div>
          <ul className="space-y-2 text-sm">
            {EMAIL && (
              <li>
                <a href={`mailto:${EMAIL}?subject=${encodeURIComponent("SpiderAML: ошибка на сайте")}`} className="text-silver-2 hover:text-silver-1">
                  Сообщить об ошибке на сайте
                </a>
              </li>
            )}
            <li>
              <Link href="/report" className="text-silver-2 hover:text-silver-1">
                Сообщить о мошенническом адресе
              </Link>
            </li>
            {EMAIL && (
              <li>
                <a href={`mailto:${EMAIL}`} className="inline-flex items-center gap-2 text-silver-2 hover:text-silver-1">
                  <Mail className="size-4" aria-hidden /> {EMAIL}
                </a>
              </li>
            )}
            {TELEGRAM && (
              <li>
                <a href={`https://t.me/${TELEGRAM}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-silver-2 hover:text-silver-1">
                  <Send className="size-4" aria-hidden /> @{TELEGRAM}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-line/60">
        <div className="mx-auto flex max-w-page flex-wrap justify-between gap-2 px-4 py-4 text-xs text-silver-3">
          <span>© {new Date().getFullYear()} SpiderAML</span>
          <span>Проверка криптоадресов по открытым и официальным данным</span>
        </div>
      </div>
    </footer>
  );
}
