import { ArrowRight, BookOpen, Check, Fish, Flag, Landmark, LineChart, Send, ShieldCheck, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SearchForm } from "@/components/SearchForm";
import type { MetaInfo } from "@/lib/api-types";
import { getMeta } from "@/lib/data";
import { dateTime, plain } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { seo, urlOf, SITE } from "@/lib/seo";

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
  const tSrc = await getTranslations({ locale, namespace: "Source" });
  const tSrcName = await getTranslations({ locale, namespace: "SourceName" });

  const TOOLS: Tool[] = [
    { href: "/check", icon: ShieldCheck, tile: "bg-ok/10 text-ok", title: t("toolCheckTitle"), question: t("toolCheckQuestion") },
    { href: "/token", icon: LineChart, tile: "bg-accent/10 text-accent", title: t("toolTokenTitle"), question: t("toolTokenQuestion") },
    { href: "/whales", icon: Fish, tile: "bg-warn/10 text-warn", title: t("toolWhalesTitle"), question: t("toolWhalesQuestion") },
    { href: "/sanctions", icon: Landmark, tile: "bg-crit/10 text-crit", title: t("toolSanctionsTitle"), question: t("toolSanctionsQuestion") },
  ];

  const EXTRA = [
    { href: "/send", icon: Send, tile: "bg-ok/10 text-ok", title: t("extraSendTitle") },
    { href: "/report", icon: Flag, tile: "bg-warn/10 text-warn", title: t("extraReportTitle") },
    { href: "/blog", icon: BookOpen, tile: "bg-accent/10 text-accent", title: t("extraBlogTitle") },
  ];

  const LEVELS = [
    { range: "0–19", name: t("levelLow"), bar: "border-t-ok" },
    { range: "20–49", name: t("levelMedium"), bar: "border-t-warn" },
    { range: "50–79", name: t("levelHigh"), bar: "border-t-crit" },
    { range: "80–100", name: t("levelCritical"), bar: "border-t-crit/60" },
  ];

  const meta: MetaInfo | null = await getMeta(21600).catch(() => null);
  const s = meta?.stats;

  const STATS = s
    ? [
        [plain(s.riskyAddresses, locale), t("statsRiskLabel")],
        [plain(s.sanctionedAddresses, locale), t("statsSanctionsLabel")],
        [plain(s.labeledAddresses, locale), t("statsLabelsLabel")],
        [t("statsNetworksValue"), t("statsNetworksLabelShort")],
      ]
    : [];

  const tMeta = await getTranslations({ locale, namespace: "Metadata" });
  // structured data: what the site is and that it has a search box (helps Google show the name and the description)
  const ld = [
    { "@context": "https://schema.org", "@type": "Organization", name: "SpiderAML", url: SITE, logo: `${SITE}/apple-icon.png` },
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
            ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", t("exampleClean")],
          ].map(([a, l]) => (
            <Link key={a} href={`/check?address=${a}&network=ethereum`} data-track={`home:example:${l}`} className="border border-line px-3 py-1 text-sm text-silver-2 transition hover:border-silver-3 hover:text-silver-1">
              {l}
            </Link>
          ))}
        </div>
      </section>

      {/* stats */}
      {STATS.length > 0 && (
        <section aria-label={t("statsAria")} className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
          {STATS.map(([n, label]) => (
            <div key={label}>
              <div className="text-3xl font-semibold tabular-nums text-silver-1">{n}</div>
              <div className="mt-1 text-sm text-silver-2">{label}</div>
            </div>
          ))}
        </section>
      )}

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

      {/* sources */}
      {meta?.sources && (
        <section>
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">{t("sourcesTitle")}</h2>
          <div className="mt-6 overflow-x-auto border border-line">
            <table className="table min-w-[640px]">
              <thead>
                <tr>
                  <th>{t("colSource")}</th>
                  <th className="hidden md:table-cell">{t("colAbout")}</th>
                  <th className="text-right">{t("colAddresses")}</th>
                  <th className="hidden text-right md:table-cell">{t("colUpdated")}</th>
                </tr>
              </thead>
              <tbody>
                {meta.sources.map((src) => (
                  <tr key={src.id}>
                    <td>
                      {src.url ? (
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="link">
                          {tSrcName.has(src.id) ? tSrcName(src.id) : src.name}
                        </a>
                      ) : tSrcName.has(src.id) ? (
                        tSrcName(src.id)
                      ) : (
                        src.name
                      )}
                      {src.kind === "sanctions" && <span className="ml-2 border border-line px-1.5 text-[11px] text-silver-2">{t("officialBadge")}</span>}
                    </td>
                    <td className="hidden text-silver-2 md:table-cell">{tSrc.has(src.id) ? tSrc(src.id) : ""}</td>
                    <td className="text-right tabular-nums">{plain(src.count, locale)}</td>
                    <td className="hidden whitespace-nowrap text-right text-silver-2 md:table-cell">{dateTime(src.fetchedAt, locale)}</td>
                  </tr>
                ))}
                <tr>
                  <td>{t("goplusName")}</td>
                  <td className="hidden text-silver-2 md:table-cell">{t("goplusAbout")}</td>
                  <td className="text-right text-silver-2">{t("online")}</td>
                  <td className="hidden text-right text-silver-2 md:table-cell">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

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
