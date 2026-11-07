import { ArrowRight, BookOpen, Check, ChevronDown, Fish, Flag, Gauge, Landmark, LineChart, ListChecks, Search, Send, ShieldCheck, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SearchForm } from "@/components/SearchForm";
import type { FrozenPage, RequestsInfo } from "@/lib/api-types";
import { latestFrozenRows } from "@/lib/freezes";
import { hasPosts } from "@/lib/blog";
import { getLatestFrozen, getRequests } from "@/lib/data";
import { RequestCounter } from "@/components/RequestCounter";
import { date, plain, short } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { seo, urlOf, SITE } from "@/lib/seo";
import { SOCIALS } from "@/lib/socials";

// Stats and source lists refresh every 6h on the data layer side; getMeta(21600) caches them for the same time.
// The page itself is rendered per request: the Docker build has no data layer to read the stats from, and a page
// prerendered without them would show an empty home for hours.
export const dynamic = "force-dynamic";

interface Tool {
  href: string;
  icon: LucideIcon;
  tile: string;
  title: string;
  question: string;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return seo(locale, "/");
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const t = await getTranslations({ locale, namespace: "Home" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });

  const TOOLS: Tool[] = [
    { href: "/check", icon: ShieldCheck, tile: "bg-ok/10 text-ok", title: t("toolCheckTitle"), question: t("toolCheckQuestion") },
    { href: "/token", icon: LineChart, tile: "bg-accent/10 text-accent", title: t("toolTokenTitle"), question: t("toolTokenQuestion") },
    { href: "/whales", icon: Fish, tile: "bg-warn/10 text-warn", title: t("toolWhalesTitle"), question: t("toolWhalesQuestion") },
    { href: "/sanctions", icon: Landmark, tile: "bg-crit/10 text-crit", title: t("toolSanctionsTitle"), question: t("toolSanctionsQuestion") },
  ];

  // everything the page needs from outside, fetched at the same time
  const [posts, frozenPage, requests]: [boolean, FrozenPage | null, RequestsInfo | null] = await Promise.all([
    hasPosts(),
    getLatestFrozen().catch(() => null),
    getRequests().catch(() => null),
  ]);

  // the newest freezes, one row per address (an issuer often blocks one address on several networks at once)
  const FROZEN = latestFrozenRows(frozenPage?.items ?? [], 5);
  const EXTRA = [
    { href: "/send", icon: Send, tile: "bg-ok/10 text-ok", title: t("extraSendTitle") },
    { href: "/report", icon: Flag, tile: "bg-warn/10 text-warn", title: t("extraReportTitle") },
    { href: "/blog", icon: BookOpen, tile: "bg-accent/10 text-accent", title: t("extraBlogTitle") },
  ].filter((x) => x.href !== "/blog" || posts);

  const STEPS = [
    { icon: Search, title: t("howStep1Title"), text: t("howStep1Text") },
    { icon: Gauge, title: t("howStep2Title"), text: t("howStep2Text") },
    { icon: ListChecks, title: t("howStep3Title"), text: t("howStep3Text") },
  ];

  const LEVELS = [
    { range: "0–19", name: t("levelLow"), bar: "border-t-ok" },
    { range: "20–49", name: t("levelMedium"), bar: "border-t-warn" },
    { range: "50–79", name: t("levelHigh"), bar: "border-t-crit" },
    { range: "80–100", name: t("levelCritical"), bar: "border-t-crit/60" },
  ];


  const tMeta = await getTranslations({ locale, namespace: "Metadata" });
  // structured data: what the site is and that it has a search box (helps Google show the name and the description)
  const FAQ_N = ["1", "2", "3", "4", "5", "6", "7"] as const;
  const ld = [
    { "@context": "https://schema.org", "@type": "Organization", name: "SpiderAML", url: SITE, logo: `${SITE}/apple-icon.png`, sameAs: SOCIALS.map((so) => so.url) },
    { "@context": "https://schema.org", "@type": "WebSite", name: "SpiderAML", url: urlOf(locale, "/"), inLanguage: locale, description: tMeta("description") },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "SpiderAML",
      url: urlOf(locale, "/"),
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: tMeta("description"),
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ_N.map((n) => ({ "@type": "Question", name: t(`faq${n}q`), acceptedAnswer: { "@type": "Answer", text: t(`faq${n}a`) } })) },
  ];

  return (
    <div className="space-y-14 sm:space-y-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      {/* hero */}
      <section className="pt-6 text-center sm:pt-12">
        <span className="inline-flex items-center gap-1.5 border border-ok/40 bg-ok/10 px-3 py-1 text-sm text-ok">
          <Check className="size-4" aria-hidden /> {t("heroBadge")}
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          {t("heroTitle")}
        </h1>

        <div className="mx-auto mt-7 max-w-2xl text-left">
          <SearchForm action="/check" size="lg" locale={locale} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {[
            ["0x098B716B8Aaf21512996dC57EB0615e2383E2f96", t("exampleSanctioned")],
            ["0x47666Fab8bd0Ac7003bce3f5C3585383F09486E2", t("exampleExploit")],
            ["0x0582aa82344b23374d065bd9de9e1a379061f467", t("exampleFrozen")],
            ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", t("exampleClean")],
          ].map(([a, l]) => (
            <Link key={a} href={`/check?address=${a}&network=ethereum`} data-track={`home:example:${l}`} className="border border-line px-3 py-1 text-sm text-silver-2 transition hover:border-silver-3 hover:text-silver-1">
              {l}
            </Link>
          ))}
        </div>
      </section>

      {/* request counter: one public number for everything people ask the service */}
      {requests && requests.total > 0 && (
        <section aria-label={t("requestsAria")}>
          <RequestCounter
            total={requests.total}
            last24h={requests.last24h}
            series={requests.series}
            locale={locale}
            labels={{
              title: t("requestsTitle"),
              kinds: t("requestsKinds"),
              today: t("requestsToday", { n: plain(requests.last24h, locale) }),
              since: requests.since ? t("requestsSince", { date: date(Date.parse(requests.since), locale) }) : null,
              chart: t("requestsChartAria"),
              chartToday: t("requestsChartToday"),
            }}
          />
        </section>
      )}

      {/* how to use: three steps and one safety tip */}
      <section aria-labelledby="how-title">
        <h2 id="how-title" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("howTitle")}
        </h2>
        <ol className="mt-6 grid gap-3 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={i} className="card flex flex-col gap-3 p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center bg-ok/10 text-sm font-semibold tabular-nums text-ok" aria-hidden>
                  {i + 1}
                </span>
                <Icon className="size-5 text-silver-3" aria-hidden />
              </div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-base leading-snug text-silver-2">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 border border-line bg-surface px-4 py-3 text-center text-base text-silver-2">{t("howTip")}</p>
      </section>

      {/* tools */}
      <section>
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">{t("toolsTitle")}</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {TOOLS.map(({ href, icon: Icon, tile, title, question }) => (
            <Link key={href} href={href} data-track={`home:tool:${href}`} className="card group flex items-center gap-4 p-5 transition hover:border-silver-3">
              <span className={cn("flex size-12 shrink-0 items-center justify-center", tile)} aria-hidden>
                <Icon className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-0.5 text-base text-silver-2">{question}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-silver-3 transition group-hover:translate-x-0.5 group-hover:text-silver-1" aria-hidden />
            </Link>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {EXTRA.map(({ href, icon: Icon, tile, title }) => (
            <Link key={href} href={href} data-track={`home:extra:${href}`} className="card flex items-center gap-3 p-4 transition hover:border-silver-3">
              <span className={cn("flex size-8 shrink-0 items-center justify-center", tile)} aria-hidden>
                <Icon className="size-4" />
              </span>
              <h3 className="text-base font-semibold">{title}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* score scale */}
      <section>
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">{t("levelsTitle")}</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LEVELS.map((l) => (
            <div key={l.range} className={cn("border-t-2 bg-surface px-4 py-4", l.bar)}>
              <div className="text-2xl font-semibold tabular-nums">{l.range}</div>
              <div className="mt-1 text-base text-silver-2">{l.name}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-sm text-silver-2">{t("levelsNote")}</p>
      </section>

      {/* newest freezes: our own live data, and it is what a P2P trader needs to know before accepting USDT */}
      {FROZEN.length > 0 && (
        <section aria-labelledby="frozen-title">
          <h2 id="frozen-title" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("frozenTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-base text-silver-2">{t("frozenText")}</p>
          <ul className="card mt-6 divide-y divide-line">
            {FROZEN.map((r) => (
              <li key={`${r.address}:${r.asset}`}>
                <Link href={`/check?address=${r.address}&network=${r.chain}`} data-track="home:frozen:check" className="group flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition hover:bg-surface-2/50">
                  <span className="font-mono text-[13px] text-silver-1">{short(r.address)}</span>
                  <span className="border border-line px-1.5 text-[11px] text-silver-2">{r.asset}</span>
                  <span className="text-sm text-silver-2">
                    {r.issuer} · {r.chains.length > 1 ? t("frozenNetworks", { n: r.chains.length }) : r.chains[0]}
                  </span>
                  <span className="ml-auto flex items-center gap-3 text-sm tabular-nums text-silver-3">
                    {date(r.at, locale)}
                    <ArrowRight className="size-4 transition group-hover:translate-x-0.5 group-hover:text-silver-1" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-sm">
            <Link href="/frozen" data-track="home:frozen:all" className="link">
              {t("frozenAll")}
            </Link>
          </p>
        </section>
      )}

      {/* frequently asked questions: plain <details>, no JavaScript; the same text goes into the structured data */}
      <section aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("faqTitle")}
        </h2>
        <div className="card mx-auto mt-6 max-w-3xl divide-y divide-line">
          {FAQ_N.map((n) => (
            <details key={n} className="group px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-silver-1 [&::-webkit-details-marker]:hidden">
                {t(`faq${n}q`)}
                <ChevronDown className="size-4 shrink-0 text-silver-3 transition group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-2 text-base leading-snug text-silver-2">{t(`faq${n}a`)}</p>
            </details>
          ))}
        </div>
        <p className="mt-3 text-center text-sm">
          <Link href="/privacy" className="link">
            {t("faqPrivacy")}
          </Link>
        </p>
      </section>

      {/* CTA */}
      <section className="border border-line bg-surface px-6 py-10 text-center sm:px-10">
        <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{t("ctaTitle")}</h2>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/check" data-track="home:cta:check" className="btn-primary">
            {tNav("checkCta")}
          </Link>
          <Link href="/report" data-track="home:cta:report" className="btn-ghost">
            {tNav("report")}
          </Link>
        </div>
      </section>
    </div>
  );
}
