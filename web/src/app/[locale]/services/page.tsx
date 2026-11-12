import type { Metadata } from "next";
import { Check, ChevronDown, Database, FileText, GraduationCap, LifeBuoy, Mail, MessagesSquare, Route, Search, Send } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/ui";
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

export default async function Services() {
  const t = await getTranslations("Services");
  const list = (key: string) => t.raw(key) as string[];
  const mailHref = EMAIL ? `mailto:${EMAIL}?subject=${encodeURIComponent(t("emailSubject"))}` : undefined;
  const faq = t.raw("faq") as { q: string; a: string }[];
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <PageTitle eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} />
        <ul className="mb-5 flex flex-wrap gap-2">
          {list("audience").map((a) => (
            <li key={a} className="border border-line px-2.5 py-1 text-sm text-silver-2">
              {a}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" data-track="services:hero:telegram" className="btn btn-primary">
            <Send className="size-4" aria-hidden /> {t("cta")}
          </a>
          {mailHref && (
            <a href={mailHref} data-track="services:hero:email" className="btn btn-ghost">
              <Mail className="size-4" aria-hidden /> {t("emailBtn")}
            </a>
          )}
        </div>
        <p className="mt-3 text-sm text-silver-3">{t("ctaNote")}</p>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="services-title">
        <h2 id="services-title" className="text-xl font-semibold text-silver-1">
          {t("servicesTitle")}
        </h2>
        {SERVICES.map(({ id, icon: Icon }) => (
          <article key={id} id={id} className="card flex scroll-mt-20 flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <Icon className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
              <div>
                <h3 className="text-lg font-semibold leading-snug text-silver-1">{t(`items.${id}.title`)}</h3>
                <p className="mt-0.5 text-base text-silver-2">{t(`items.${id}.lead`)}</p>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="label mb-2">{t("includesLabel")}</div>
                <ul className="flex flex-col gap-1.5 text-[15px] leading-relaxed text-silver-2">
                  {list(`items.${id}.includes`).map((x) => (
                    <li key={x} className="flex gap-2">
                      <Check className="mt-1 size-4 shrink-0 text-ok" aria-hidden />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="label mb-2">{t("resultLabel")}</div>
                <ul className="flex flex-col gap-1.5 text-[15px] leading-relaxed text-silver-2">
                  {list(`items.${id}.result`).map((x) => (
                    <li key={x} className="flex gap-2">
                      <FileText className="mt-1 size-4 shrink-0 text-silver-3" aria-hidden />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line/60 pt-4">
              <dl className="grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
                <div>
                  <dt className="label">{t("inputLabel")}</dt>
                  <dd className="text-silver-2">{t(`items.${id}.input`)}</dd>
                </div>
                <div>
                  <dt className="label">{t("termLabel")}</dt>
                  <dd className="text-silver-2">{t(`items.${id}.term`)}</dd>
                </div>
              </dl>
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" data-track={`services:discuss:${id}`} className="btn btn-ghost">
                {t("discuss")}
              </a>
            </div>
          </article>
        ))}
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold text-silver-1">{t("toolsTitle")}</h2>
        <p className="text-base text-silver-2">{t("toolsLead")}</p>
        <ul className="flex flex-col gap-1.5 text-[15px] leading-relaxed text-silver-2">
          {list("tools").map((x) => (
            <li key={x} className="flex gap-2">
              <Check className="mt-1 size-4 shrink-0 text-ok" aria-hidden />
              <span>{x}</span>
            </li>
          ))}
        </ul>
        <Link href="/check" data-track="services:tools:check" className="link self-start text-[15px]">
          {t("toolsLink")}
        </Link>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="how-title">
        <h2 id="how-title" className="text-xl font-semibold text-silver-1">
          {t("howTitle")}
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {list("steps").map((s, i) => (
            <li key={s} className="card flex flex-col gap-2 p-4">
              <span className="flex size-7 items-center justify-center border border-line text-sm font-semibold text-silver-1">{i + 1}</span>
              <span className="text-[15px] leading-relaxed text-silver-2">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-xl font-semibold text-silver-1">
          {t("faqTitle")}
        </h2>
        <div className="flex flex-col gap-2">
          {faq.map((f) => (
            <details key={f.q} className="group card p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-medium text-silver-1 [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-4 shrink-0 text-silver-3 transition group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-silver-2">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-silver-3">{t("scope")}</p>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold text-silver-1">{t("contactTitle")}</h2>
        <p className="text-base leading-relaxed text-silver-2">{t("contactText")}</p>
        <div className="flex flex-wrap gap-3">
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" data-track="services:telegram" className="btn btn-primary">
            <Send className="size-4" aria-hidden /> {t("telegramBtn")}
          </a>
          {mailHref && (
            <a href={mailHref} data-track="services:email" className="btn btn-ghost">
              <Mail className="size-4" aria-hidden /> {t("emailBtn")}
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
