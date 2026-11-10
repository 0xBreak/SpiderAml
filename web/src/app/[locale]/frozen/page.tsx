// Addresses Tether and Circle have blocked in their own contracts right now (USDT: Ethereum, Tron; USDC: Ethereum, Arbitrum, Base, Polygon, Avalanche, Optimism).
// A freezing is the issuer's decision, not a finding of a crime, and an address can be released: the wording says so.
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Addr } from "@/components/Addr";
import { ClearInput } from "@/components/ClearInput";
import { Card, Empty, ErrorBox, Notice, PageTitle } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/routing";
import type { FrozenPage } from "@/lib/api-types";
import { DataError, getFrozen, limit } from "@/lib/data";
import { cn, date, dateTime } from "@/lib/format";
import { safeTarget, trackEvent } from "@/lib/metrics";
import { one } from "@/lib/action";
import { seo } from "@/lib/seo";

export const dynamic = "force-dynamic";

type SP = Promise<{ q?: string; chain?: string; asset?: string; page?: string }>;

const PAGE_SIZE = 25;
const CHAINS = ["ethereum", "arbitrum", "polygon", "base", "optimism", "avalanche", "tron"] as const;
const CHAIN_LABEL: Record<string, string> = { ethereum: "Ethereum", arbitrum: "Arbitrum", polygon: "Polygon", base: "Base", optimism: "Optimism", avalanche: "Avalanche", tron: "Tron" };
const EXPLORER: Record<string, (a: string) => string> = {
  ethereum: (a) => `https://etherscan.io/address/${a}`,
  arbitrum: (a) => `https://arbiscan.io/address/${a}`,
  polygon: (a) => `https://polygonscan.com/address/${a}`,
  base: (a) => `https://basescan.org/address/${a}`,
  optimism: (a) => `https://optimistic.etherscan.io/address/${a}`,
  avalanche: (a) => `https://snowtrace.io/address/${a}`,
  tron: (a) => `https://tronscan.org/#/address/${a}`,
};

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Frozen" });
  return { title: t("pageTitle"), description: t("metaDescription"), ...seo(locale, "/frozen", await searchParams) };
}

const TH = "whitespace-nowrap border-b border-line px-3 py-3 text-sm font-medium text-silver-2 first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5";
const TD = "px-3 py-3.5 align-middle first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5";
const LINK = "inline-flex items-center gap-1.5 text-silver-1 underline decoration-line underline-offset-4 transition hover:decoration-silver-2";

export default async function Frozen({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  // a repeated query parameter arrives as an array: only its first value is used
  const sp = { q: one(raw.q), chain: one(raw.chain), asset: one(raw.asset), page: one(raw.page) };
  const t = await getTranslations("Frozen");
  const locale = (await getLocale()) as Locale;
  const fmt = (n: number) => n.toLocaleString(locale === "en" ? "en-US" : "ru-RU");
  const chain = (CHAINS as readonly string[]).includes(sp.chain ?? "") ? sp.chain : undefined;
  const asset = sp.asset === "USDT" || sp.asset === "USDC" ? sp.asset : undefined;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  let data: FrozenPage | null = null;
  let error: DataError | null = null;
  try {
    await limit("frozen", 30);
    data = await getFrozen({ q, chain, asset, page, pageSize: PAGE_SIZE });
    if (q || chain || asset) trackEvent("sanctions_search", "frozen", "/frozen", { target: q ? safeTarget(q) : null, network: chain ?? null });
  } catch (e) {
    error = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
  }
  if (data && (!Array.isArray(data.items) || !Array.isArray(data.groups) || typeof data.total !== "number")) {
    error = new DataError("UPSTREAM", "", 500);
    data = null;
  }

  const href = (over: { chain?: string | null; asset?: string | null; page?: number }) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    const c = over.chain === undefined ? chain : over.chain;
    const a = over.asset === undefined ? asset : over.asset;
    if (c) u.set("chain", c);
    if (a) u.set("asset", a);
    if (over.page && over.page > 1) u.set("page", String(over.page));
    const s = u.toString();
    return `/frozen${s ? `?${s}` : ""}`;
  };
  const EVM = /^0x[0-9a-fA-F]{40}$/;
  const TRON = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
  const full = q && !chain && !asset && (EVM.test(q) || TRON.test(q)) ? q : null;
  const hits = full && data ? data.items.filter((i) => i.address.toLowerCase() === full.toLowerCase()) : [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const action = locale === DEFAULT_LOCALE ? "/frozen" : `/${locale}/frozen`;
  const checkHref = (a: string, c: string) => `/check?address=${a}&network=${c === "tron" ? "tron" : c}`;

  return (
    <div className="space-y-5">
      <PageTitle title={t("title")} sub={t("sub")} />
      {error && <ErrorBox code={error.code} message={error.message} />}
      {data && (
        <>
          <p className="text-base text-silver-2">
            {t("summary", { addresses: fmt(data.distinctAddresses) })}
            {data.updatedAt ? ` · ${t("updated", { date: dateTime(data.updatedAt, locale) })}` : ""}
          </p>

          <form action={action} method="get" className="flex flex-col gap-2 sm:flex-row" role="search">
            <span className="relative block sm:flex-1">
              <input name="q" defaultValue={q} maxLength={100} autoComplete="off" spellCheck={false} placeholder={t("searchPlaceholder")} aria-label={t("search")} className="input pr-10 font-mono" />
              <ClearInput />
            </span>
            {chain && <input type="hidden" name="chain" value={chain} />}
            {asset && <input type="hidden" name="asset" value={asset} />}
            <button type="submit" className="btn-primary">
              {t("searchButton")}
            </button>
          </form>

          <div className="flex flex-wrap gap-2" role="group" aria-label={t("filters")}>
            <Link href={href({ chain: null, asset: null })} className={cn("border px-3 py-1.5 text-sm transition", !chain && !asset ? "border-accent-from text-silver-1" : "border-line text-silver-2 hover:border-silver-3")}>
              {t("all")}
            </Link>
            {data.groups.map((g) => (
              <Link
                key={`${g.chain}-${g.asset}`}
                href={href({ chain: g.chain, asset: g.asset })}
                className={cn("border px-3 py-1.5 text-sm transition", chain === g.chain && asset === g.asset ? "border-accent-from text-silver-1" : "border-line text-silver-2 hover:border-silver-3")}
              >
                {CHAIN_LABEL[g.chain] ?? g.chain} · {g.asset} <span className="tabular-nums text-silver-3">{fmt(g.count)}</span>
              </Link>
            ))}
          </div>

          {full && (
            <Card title={<span className="text-lg">{hits.length > 0 ? t("verdictFrozen") : t("verdictClear")}</span>}>
              <div className="space-y-3 text-base text-silver-2">
                <Addr value={full} className="text-base text-silver-1" />
                {hits.length > 0 ? (
                  <ul className="space-y-1">
                    {hits.map((h) => (
                      <li key={`${h.chain}-${h.asset}`}>
                        {h.issuer} · {CHAIN_LABEL[h.chain] ?? h.chain} · {h.asset} · {t("frozenOn", { date: date(h.frozenAt * 1000, locale) })}{" "}
                        <a href={h.txUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
                          {t("transaction")}
                          <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{t("verdictClearText")}</p>
                )}
                <Link href={`/check?address=${full}`} className={LINK}>
                  {t("fullCheck")}
                </Link>
              </div>
            </Card>
          )}

          <Notice>{t("note")}</Notice>

          {!full && (
          <Card title={<span className="text-lg">{t("found", { count: fmt(data.total) })}</span>}>
            {data.items.length === 0 ? (
              <Empty>
                <span className="text-base text-silver-2">{t("nothing")}</span>
              </Empty>
            ) : (
              <>
                <ul className="divide-y divide-line/40 md:hidden">
                  {data.items.map((s) => (
                    <li key={`${s.chain}-${s.asset}-${s.address}`} className="py-4">
                      <Addr value={s.address} href={EXPLORER[s.chain]?.(s.address)} className="text-base text-silver-1" />
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-silver-2">
                        <span>{CHAIN_LABEL[s.chain] ?? s.chain} · {s.asset}</span>
                        <span>{t("frozenOn", { date: date(s.frozenAt * 1000, locale) })}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <a href={s.txUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
                          {t("transaction")}
                          <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                        <Link href={checkHref(s.address, s.chain)} className={LINK}>
                          {t("check")}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="-mx-4 hidden overflow-x-auto sm:-mx-5 md:block">
                  <table className="w-full min-w-[720px] text-left text-base">
                    <thead>
                      <tr>
                        <th className={TH}>{t("colAddress")}</th>
                        <th className={TH}>{t("colNetwork")}</th>
                        <th className={TH}>{t("colIssuer")}</th>
                        <th className={TH}>{t("colFrozen")}</th>
                        <th className={TH}>{t("colTx")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((s) => (
                        <tr key={`${s.chain}-${s.asset}-${s.address}`} className="border-b border-line/40 transition-colors last:border-0 hover:bg-surface-2/30">
                          <td className={TD}>
                            <Addr value={s.address} href={EXPLORER[s.chain]?.(s.address)} className="text-base text-silver-1" />
                            <Link href={checkHref(s.address, s.chain)} className="mt-1 block text-sm text-silver-2 underline decoration-line underline-offset-4 hover:decoration-silver-2">
                              {t("check")}
                            </Link>
                          </td>
                          <td className={cn(TD, "whitespace-nowrap")}>
                            <div className="text-silver-1">{CHAIN_LABEL[s.chain] ?? s.chain}</div>
                            <div className="text-sm text-silver-2">{s.asset}</div>
                          </td>
                          <td className={cn(TD, "whitespace-nowrap text-silver-1")}>{s.issuer}</td>
                          <td className={cn(TD, "whitespace-nowrap text-silver-2")}>{date(s.frozenAt * 1000, locale)}</td>
                          <td className={cn(TD, "whitespace-nowrap")}>
                            <a href={s.txUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
                              {t("transaction")}
                              <ExternalLink className="size-3.5" aria-hidden />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pages > 1 && (
                  <nav className="mt-4 flex items-center justify-between gap-3 text-sm text-silver-2" aria-label={t("pagination")}>
                    {page > 1 ? (
                      <Link href={href({ page: page - 1 })} className="btn-ghost h-9 px-3">
                        <ChevronLeft className="size-4" aria-hidden /> {t("prev")}
                      </Link>
                    ) : (
                      <span />
                    )}
                    <span className="tabular-nums">{t("pageOf", { page, pages: fmt(pages) })}</span>
                    {page < pages ? (
                      <Link href={href({ page: page + 1 })} className="btn-ghost h-9 px-3">
                        {t("next")} <ChevronRight className="size-4" aria-hidden />
                      </Link>
                    ) : (
                      <span />
                    )}
                  </nav>
                )}
              </>
            )}
          </Card>
          )}
        </>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: (["1", "2", "3", "4"] as const).map((n) => ({ "@type": "Question", name: t(`faq${n}q`), acceptedAnswer: { "@type": "Answer", text: t(`faq${n}a`) } })),
          }).replace(/</g, "\\u003c"),
        }}
      />
      <section className="space-y-4 pt-4" aria-labelledby="faq">
        <h2 id="faq" className="text-xl font-medium text-silver-1">
          {t("faqTitle")}
        </h2>
        {(["1", "2", "3", "4"] as const).map((n) => (
          <div key={n} className="space-y-1">
            <h3 className="text-base font-medium text-silver-1">{t(`faq${n}q`)}</h3>
            <p className="text-base text-silver-2">{t(`faq${n}a`)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
