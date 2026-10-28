import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ArrowDownUp, ArrowRight, Coins, Droplets, ExternalLink, Tag } from "lucide-react";
import { Addr } from "@/components/Addr";
import { SearchForm } from "@/components/SearchForm";
import { Badge, Card, CardSkeleton, Empty, ErrorBox, PageTitle, Stat } from "@/components/ui";
import { GaEvent } from "@/components/Analytics";
import { WhalesTable } from "./WhalesTable";
import { DataError, getWhales, limit } from "@/lib/data";
import { trackEvent } from "@/lib/metrics";
import { dateTime, num, usd } from "@/lib/format";
import { NETWORKS, isNetworkId, type NetworkId } from "@/lib/networks";
import type { Locale } from "@/i18n/routing";
import type { WhaleTransferKind } from "@/lib/types";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Whales" });
  return { title: t("title"), ...seo(locale, "/whales", await searchParams) };
}
export const dynamic = "force-dynamic";

type SP = Promise<{ address?: string; network?: string; usd?: string; window?: string }>;

const WINDOWS = ["1h", "6h", "24h", "7d"] as const;
type Window = (typeof WINDOWS)[number];
const PRESETS = [10_000, 50_000, 100_000, 500_000, 1_000_000];
const FEATURES = [
  { icon: ArrowDownUp, key: "featTransfers" },
  { icon: Coins, key: "featBuys" },
  { icon: Droplets, key: "featSells" },
  { icon: Tag, key: "featLabels" },
] as const;
const TYPE: Record<WhaleTransferKind, { key: "typeBuy" | "typeSell" | "typeTransfer" | "typeMint" | "typeBurn"; tone: "ok" | "crit" | "muted" | "info" }> = {
  buy: { key: "typeBuy", tone: "ok" },
  sell: { key: "typeSell", tone: "crit" },
  transfer: { key: "typeTransfer", tone: "muted" },
  mint: { key: "typeMint", tone: "info" },
  burn: { key: "typeBurn", tone: "muted" },
};

export default async function WhalesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const network = sp.network && isNetworkId(sp.network) ? sp.network : "ethereum";
  const threshold = Math.min(1e9, Math.max(100, Number(sp.usd) || 50_000));
  const window: Window = (WINDOWS as readonly string[]).includes(sp.window ?? "") ? (sp.window as Window) : "24h";
  const t = await getTranslations("Whales");
  const locale = (await getLocale()) as Locale;

  return (
    <div className="space-y-5">
      <PageTitle title={t("title")} sub={t("sub")} />
      <SearchForm action="/whales" address={sp.address} network={network} placeholder={t("placeholder")} button={t("button")}>
        <label className="sm:w-36">
          <span className="sr-only">{t("threshold")}</span>
          <select name="usd" defaultValue={String(threshold)} className="input">
            {[...new Set([...PRESETS, threshold])].sort((a, b) => a - b).map((p) => (
              <option key={p} value={p}>
                {t("from")} {usd(p, true, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:w-32">
          <span className="sr-only">{t("period")}</span>
          <select name="window" defaultValue={window} className="input">
            {WINDOWS.map((k) => (
              <option key={k} value={k}>
                {t(`w${k}`)}
              </option>
            ))}
          </select>
        </label>
      </SearchForm>
      {sp.address ? (
        <Suspense key={`${sp.address}-${network}-${threshold}-${window}`} fallback={<CardSkeleton title={t("loading")} lines={10} />}>
          <Report address={sp.address.trim()} network={network} threshold={threshold} window={window} />
        </Suspense>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FEATURES.map(({ icon: Icon, key }) => (
            <div key={key} className="card flex min-h-20 items-center gap-3 border-line/60 bg-surface/60 p-4">
              <Icon className="size-5 shrink-0 text-silver-2" aria-hidden />
              <span className="text-base leading-snug text-silver-1">{t(key)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function Report({ address, network, threshold, window }: { address: string; network: NetworkId; threshold: number; window: Window }) {
  const t = await getTranslations("Whales");
  const locale = (await getLocale()) as Locale;
  const $ = (v: number | null | undefined, compact = true) => usd(v, compact, locale);
  let r: Awaited<ReturnType<typeof getWhales>>;
  try {
    await limit("whales", 6);
    r = await getWhales(address, network, threshold, window);
    trackEvent("whales", `${r.token.symbol ?? "?"} > $${threshold}`, "/whales", { target: address, network });
  } catch (e) {
    const err = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
    return <ErrorBox code={err.code} message={err.message} />;
  }
  const ex = NETWORKS[network].explorer;
  const s = r.summary;
  const covered = r.coverage.coveredSec / r.coverage.requestedWindowSec;
  // zero buys AND zero sells means no swap was recognised (e.g. WETH, a main trading pair), not "nobody traded"
  const dexKnown = (s.dexBuyUsd ?? 0) + (s.dexSellUsd ?? 0) > 0;

  return (
    <div className="space-y-4">
      <GaEvent name="whales_scan" params={{ network, window, found: s.transfers > 0 }} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 [&_.label]:text-sm [&_.label]:font-medium [&_.label]:normal-case [&_.label]:tracking-normal [&_.label]:text-silver-2">
        <Stat label={t("bigTransfers")} value={<span className="text-2xl lg:text-3xl">{num(s.transfers, locale)}</span>} />
        <Stat label={t("wallets")} value={<span className="text-2xl lg:text-3xl">{num(s.wallets, locale)}</span>} />
        <Stat label={t("dexBuy")} value={<span className="text-2xl lg:text-3xl">{dexKnown ? $(s.dexBuyUsd) : "—"}</span>} tone={dexKnown ? "ok" : undefined} sub={dexKnown ? undefined : t("dexNone")} />
        <Stat label={t("dexSell")} value={<span className="text-2xl lg:text-3xl">{dexKnown ? $(s.dexSellUsd) : "—"}</span>} tone={dexKnown ? "crit" : undefined} sub={dexKnown ? undefined : t("dexNone")} />
      </div>
      {!dexKnown && <p className="text-sm text-silver-2">{t("dexNoneNote")}</p>}
      {r.thresholdBasis === "supply" && <p className="text-base text-warn">{t("noPrice")}</p>}
      {covered < 0.95 && (
        <p className="text-base text-silver-2">
          {t("partial", { hours: Math.max(1, Math.round(r.coverage.coveredSec / 3600)) })}
        </p>
      )}

      <Card title={t("walletsTitle")}>
        {r.wallets.length === 0 ? (
          <Empty>
            <span className="text-base text-silver-2">{t("none", { value: $(r.thresholdUsd) })}</span>
          </Empty>
        ) : (
          <WhalesTable wallets={r.wallets} labels={r.labels} explorer={ex} />
        )}
      </Card>

      {r.transfers.length > 0 && (
        <Card title={t("topTransfers")}>
          <ul className="divide-y divide-line/40">
            {r.transfers.slice(0, 30).map((x) => (
              <li key={x.tx + x.from + x.to} className="py-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Badge tone={TYPE[x.type].tone}>{t(TYPE[x.type].key)}</Badge>
                  <span className="text-lg font-semibold tabular-nums text-silver-1">{$(x.usd, false)}</span>
                  <span className="text-base text-silver-2">
                    {num(x.tokens, locale)} {r.token.symbol}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-2 text-sm text-silver-2">
                    {dateTime(x.ts * 1000, locale)}
                    <a
                      href={`${ex}/tx/${x.tx}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("tx")}
                      className="text-silver-2 transition hover:text-silver-1"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Addr value={x.from} className="text-sm text-silver-1" />
                  <ArrowRight className="size-4 shrink-0 text-silver-3" aria-hidden />
                  <Addr value={x.to} className="text-sm text-silver-1" />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
