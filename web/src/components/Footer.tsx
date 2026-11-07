import { Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ConsentSettings } from "./Analytics";
import { Logo } from "./Logo";
import { SocialIcon } from "./SocialIcons";
import { SOCIALS } from "@/lib/socials";
import { visibleNav } from "./Header";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

// Contacts are shown only when configured (build args in docker-compose), so a dead address never reaches the site.
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
const TELEGRAM = process.env.NEXT_PUBLIC_TELEGRAM?.trim().replace(/^@/, "");

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Nav" });
  const tF = await getTranslations({ locale, namespace: "Footer" });
  const tC = await getTranslations({ locale, namespace: "Common" });
  const items = (await visibleNav()).filter((n) => n.href !== "/").map((n) => ({ href: n.href, label: t(n.key) }));
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto grid max-w-page gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-silver-3">{tC("disclaimer")}</p>
          {SOCIALS.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1" aria-label={tF("socials")}>
              {SOCIALS.map((so) => (
                <li key={so.id}>
                  <a
                    href={so.url}
                    target="_blank"
                    rel="noopener noreferrer me"
                    aria-label={so.label}
                    title={so.label}
                    data-track={`footer:social:${so.id}`}
                    className="flex size-10 items-center justify-center border border-line text-silver-2 transition hover:border-silver-3 hover:text-silver-1"
                  >
                    <SocialIcon id={so.id} className="size-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="label mb-3">{t("sections")}</div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {items.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-silver-2 hover:text-silver-1">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="label mb-3">{tF("contact")}</div>
          <ul className="space-y-2 text-sm">
            {EMAIL && (
              <li>
                <a href={`mailto:${EMAIL}?subject=${encodeURIComponent(tF("reportBugSubject"))}`} className="text-silver-2 hover:text-silver-1">
                  {tF("reportBug")}
                </a>
              </li>
            )}
            <li>
              <Link href="/report" className="text-silver-2 hover:text-silver-1">
                {tF("reportAddress")}
              </Link>
            </li>
            {EMAIL && (
              <li>
                <a href={`mailto:${EMAIL}`} className="inline-flex items-center gap-2 text-silver-2 hover:text-silver-1">
                  <Mail className="size-4" aria-hidden /> {EMAIL}
                </a>
              </li>
            )}
            {TELEGRAM && !SOCIALS.some((so) => so.url.toLowerCase().endsWith(`/${TELEGRAM.toLowerCase()}`)) && (
              <li>
                <a href={`https://t.me/${TELEGRAM}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-silver-2 hover:text-silver-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/telegram.svg" alt="" aria-hidden="true" className="size-4" /> @{TELEGRAM}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-line/60">
        <div className="mx-auto flex max-w-page flex-wrap justify-between gap-2 px-4 py-4 text-xs text-silver-3">
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} SpiderAML</span>
            <Link href="/terms" className="hover:text-silver-1">
              {tF("terms")}
            </Link>
            <Link href="/privacy" className="hover:text-silver-1">
              {tF("privacy")}
            </Link>
            <ConsentSettings />
          </span>
          <span>{tF("tagline")}</span>
        </div>
      </div>
    </footer>
  );
}
