import type { Metadata } from "next";
import { Database, FileText, GraduationCap, LifeBuoy, Mail, MessagesSquare, Route, Search, Send } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Notice, PageTitle } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { EMAIL, TELEGRAM_URL } from "@/lib/contact";
import { seo } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Services" });
  return { title: t("title"), description: t("metaDescription"), ...seo(locale, "/services") };
}

const SERVICES = [
  { id: "tracing", icon: Route },
  { id: "project", icon: Search },
  { id: "dossier", icon: FileText },
  { id: "incident", icon: LifeBuoy },
  { id: "training", icon: GraduationCap },
  { id: "data", icon: Database },
  { id: "consulting", icon: MessagesSquare },
] as const;
/** The article about scams (recovery scammers included) in each language. */
const SCAM_ARTICLE: Record<string, string> = { ru: "skhemy-moshennichestva-v-kripte", en: "crypto-scam-types" };

export default async function Services() {
  const t = await getTranslations("Services");
  const locale = await getLocale();
  const mail = (subject: string) => (EMAIL ? `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}` : undefined);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageTitle eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} />

      <div className="grid gap-4 sm:grid-cols-2">
        {SERVICES.map(({ id, icon: Icon }) => {
          const title = t(`items.${id}.title`);
          const href = mail(`${t("emailSubject")} - ${title}`) ?? TELEGRAM_URL;
          return (
            <section key={id} className="card flex flex-col gap-3 p-5">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                <h2 className="text-lg font-semibold leading-snug text-silver-1">{title}</h2>
              </div>
              <p className="text-base leading-relaxed text-silver-2">{t(`items.${id}.text`)}</p>
              <div>
                <div className="label mb-1">{t("resultLabel")}</div>
                <p className="text-[15px] leading-relaxed text-silver-2">{t(`items.${id}.result`)}</p>
              </div>
              <div>
                <div className="label mb-1">{t("whoLabel")}</div>
                <p className="text-[15px] leading-relaxed text-silver-2">{t(`items.${id}.who`)}</p>
              </div>
              {href && (
                <a href={href} data-track={`services:discuss:${id}`} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="btn btn-ghost mt-auto self-start">
                  {t("discuss")}
                </a>
              )}
            </section>
          );
        })}
      </div>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold text-silver-1">{t("howTitle")}</h2>
        <ol className="flex flex-col gap-2.5 text-base leading-relaxed text-silver-2">
          {(t.raw("steps") as string[]).map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center border border-line text-sm text-silver-1">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <Notice tone="warn">
        <span className="font-semibold">{t("honestTitle")}.</span> {t("honest")}{" "}
        <Link href={`/blog/${SCAM_ARTICLE[locale] ?? SCAM_ARTICLE.en}`} className="link">
          {t("honestLink")}
        </Link>
      </Notice>

      <p className="text-sm leading-relaxed text-silver-3">{t("scope")}</p>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold text-silver-1">{t("contactTitle")}</h2>
        <p className="text-base leading-relaxed text-silver-2">{t("contactText")}</p>
        <div className="flex flex-wrap gap-3">
          {EMAIL && (
            <a href={mail(t("emailSubject"))} data-track="services:email" className="btn btn-primary">
              <Mail className="size-4" aria-hidden /> {t("emailBtn")}
            </a>
          )}
          {TELEGRAM_URL && (
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" data-track="services:telegram" className="btn btn-ghost">
              <Send className="size-4" aria-hidden /> {t("telegramBtn")}
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
