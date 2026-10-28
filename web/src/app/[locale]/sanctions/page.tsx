import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, ExternalLink, MoreHorizontal } from "lucide-react";
import { Addr } from "@/components/Addr";
import { Card, Empty, ErrorBox, Notice, PageTitle } from "@/components/ui";
import { GaEvent } from "@/components/Analytics";
import { SanctionsFilters } from "./Filters";
import type { SanctionsPage } from "@/lib/api-types";
import { DataError, getSanctions } from "@/lib/data";
import { trackEvent } from "@/lib/metrics";
import { cn, date, dateTime } from "@/lib/format";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sanctions");
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

type SP = Promise<{ q?: string; chain?: string; list?: string; page?: string; pageSize?: string }>;

const PAGE_SIZES = [10, 20, 50] as const;

/** 1 … page-1, page, page+1 … last (max 7 numbers, no duplicates). */
function pageNumbers(page: number, pages: number): (number | "gap")[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) out.push("gap");
    out.push(n);
    prev = n;
  }
  return out;
}

const EXPLORER: Record<string, (a: string) => string> = {
  evm: (a) => `https://etherscan.io/address/${a}`,
  tron: (a) => `https://tronscan.org/#/address/${a}`,
  bitcoin: (a) => `https://mempool.space/address/${a}`,
};

const TH = "whitespace-nowrap border-b border-line px-3 py-3 text-sm font-medium text-silver-2 first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5";
const TD = "px-3 py-3.5 align-middle first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5";
const LINK = "inline-flex items-center gap-1.5 text-silver-1 underline decoration-line underline-offset-4 transition hover:decoration-silver-2";

export default async function Sanctions({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const t = await getTranslations("Sanctions");
  const tChain = await getTranslations("Chain");
  const locale = (await getLocale()) as Locale;
  const chainName = (c: string) => (tChain.has(c) ? tChain(c) : c);
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = (PAGE_SIZES as readonly number[]).includes(Number(sp.pageSize)) ? Number(sp.pageSize) : 10;
  let data: SanctionsPage | null = null;
  let error: DataError | null = null;
  try {
    data = await getSanctions({ q: sp.q?.slice(0, 100), chain: sp.chain, list: sp.list, page, pageSize });
    if (sp.q || sp.chain || sp.list) trackEvent("sanctions_search", sp.list ?? sp.chain ?? "search", "/sanctions", { target: sp.q ?? null, network: sp.chain ?? null });
  } catch (e) {
    error = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
  }
  // Guard against a malformed upstream payload instead of crashing the route.
  if (
    data &&
    (!Array.isArray(data.sources) ||
      !Array.isArray(data.items) ||
      !Array.isArray(data.chains) ||
      !Array.isArray(data.lists) ||
      typeof data.total !== "number" ||
      typeof data.pageSize !== "number")
  ) {
    error = new DataError("UPSTREAM", "", 500);
    data = null;
  }

  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (sp.q) u.set("q", sp.q);
    if (sp.chain) u.set("chain", sp.chain);
    if (sp.list) u.set("list", sp.list);
    if (pageSize !== 10) u.set("pageSize", String(pageSize));
    u.set("page", String(p));
    return `/sanctions?${u}`;
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <PageTitle title={t("title")} sub={t("sub")} />
      {error && <ErrorBox code={error.code} message={error.message} />}
      {data && (sp.q || sp.chain || sp.list) && (
        // the search text itself is never sent: only that a search happened and the coarse filters
        <GaEvent name="sanctions_search" params={{ has_text: !!sp.q, network: sp.chain ?? "all", list: sp.list ?? "all", results: data.total > 0 }} />
      )}
      {data && (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            {data.sources.map((src) => (
              <a
                key={src.id}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card flex items-start justify-between gap-4 p-4 transition hover:border-silver-3"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-base font-medium text-silver-1">
                    {src.name}
                    <ExternalLink className="size-4 shrink-0 text-silver-3" aria-hidden />
                  </span>
                  <span className="text-sm text-silver-2">
                    {src.error ? t("updateFailed") : t("updated", { date: dateTime(src.fetchedAt, locale) })}
                  </span>
                </span>
                <span className="shrink-0 text-2xl font-semibold tabular-nums text-silver-1">
                  {src.count.toLocaleString(locale === "en" ? "en-US" : "ru-RU")}
                </span>
              </a>
            ))}
          </div>

          <SanctionsFilters initial={{ q: sp.q, chain: sp.chain, list: sp.list }} chains={data.chains} lists={data.lists} />
          <Notice>{t("evmNote")}</Notice>

          <Card title={<span className="text-lg">{t("found", { count: data.total.toLocaleString(locale === "en" ? "en-US" : "ru-RU") })}</span>}>
            {data.items.length === 0 ? (
              <Empty>
                <span className="text-base text-silver-2">{t("nothing")}</span>
              </Empty>
            ) : (
              <>
                <ul className="divide-y divide-line/40 md:hidden">
                  {data.items.map((s) => (
                    <li key={s.address + s.list} className="py-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <div className="text-base font-medium text-silver-1">{s.name}</div>
                        {s.listedAt && <div className="text-sm text-silver-2">{t("since", { date: date(s.listedAt, locale) })}</div>}
                      </div>
                      {s.program && <div className="mt-0.5 text-sm text-silver-2">{s.program}</div>}
                      <div className="mt-1.5">
                        <Addr value={s.address} href={EXPLORER[s.chain]?.(s.address)} className="text-base text-silver-1" />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-silver-2">
                        <span>{chainName(s.chain)}</span>
                        <span>{s.asset}</span>
                        <a
                          href={s.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={LINK}
                        >
                          {s.list}
                          <ExternalLink className="size-3.5" aria-hidden />
                        </a>
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
                        <th className={TH}>{t("colOwner")}</th>
                        <th className={TH}>{t("colList")}</th>
                        <th className={TH}>{t("colListed")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((s) => (
                        <tr key={s.address + s.list} className="border-b border-line/40 transition-colors last:border-0 hover:bg-surface-2/30">
                          <td className={TD}>
                            <Addr value={s.address} href={EXPLORER[s.chain]?.(s.address)} className="text-base text-silver-1" />
                          </td>
                          <td className={cn(TD, "whitespace-nowrap")}>
                            <div className="text-silver-1">{chainName(s.chain)}</div>
                            <div className="text-sm text-silver-2">{s.asset}</div>
                          </td>
                          <td className={TD}>
                            <div className="text-silver-1">{s.name}</div>
                            {s.program && <div className="mt-0.5 text-sm text-silver-2">{s.program}</div>}
                          </td>
                          <td className={cn(TD, "whitespace-nowrap")}>
                            <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
                              {s.list}
                              <ExternalLink className="size-3.5" aria-hidden />
                            </a>
                          </td>
                          <td className={cn(TD, "whitespace-nowrap text-silver-2")}>
                            {s.listedAt ? date(s.listedAt, locale) : <span className="text-silver-2">{t("notGiven")}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {pages > 1 && (
              <nav className="mt-5 flex items-center justify-between gap-3" aria-label={t("pagesLabel")}>
                <span className="text-sm text-silver-2 sm:text-base">
                  {t("pageOf", { page, pages })}
                </span>
                <div className="flex items-center gap-1">
                  <div className="mr-1 hidden items-center gap-1 sm:flex">
                    {pageNumbers(page, pages).map((n, i) =>
                      n === "gap" ? (
                        <span key={`gap-${i}`} className="flex size-9 items-center justify-center text-silver-3" aria-hidden>
                          <MoreHorizontal className="size-4" />
                        </span>
                      ) : n === page ? (
                        <span key={n} aria-current="page" className="flex size-9 items-center justify-center border border-silver-2 bg-surface-2 text-sm font-semibold tabular-nums text-silver-1">
                          {n}
                        </span>
                      ) : (
                        <Link key={n} href={qs(n)} className="flex size-9 items-center justify-center border border-transparent text-sm tabular-nums text-silver-2 transition hover:border-line hover:text-silver-1">
                          {n}
                        </Link>
                      ),
                    )}
                  </div>
                  {page > 1 ? (
                    <Link href={qs(page - 1)} aria-label={t("prev")} className="btn-ghost size-9 px-0">
                      <ChevronLeft className="size-4" aria-hidden />
                    </Link>
                  ) : (
                    <span aria-disabled="true" className="btn-ghost size-9 px-0 opacity-40">
                      <ChevronLeft className="size-4" aria-hidden />
                    </span>
                  )}
                  {page < pages ? (
                    <Link href={qs(page + 1)} aria-label={t("next")} className="btn-ghost size-9 px-0">
                      <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  ) : (
                    <span aria-disabled="true" className="btn-ghost size-9 px-0 opacity-40">
                      <ChevronRight className="size-4" aria-hidden />
                    </span>
                  )}
                </div>
              </nav>
            )}
          </Card>
          <p className="text-sm text-silver-2">{t("foot")}</p>
        </>
      )}
    </div>
  );
}
