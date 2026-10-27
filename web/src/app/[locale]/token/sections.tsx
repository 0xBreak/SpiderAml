// AML page blocks. Each async block fetches its own section from the data layer; a failure stays inside its card.
import { Link } from "@/i18n/navigation";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { RiskContext } from "@/components/RiskContext";
import type { Locale } from "@/i18n/routing";
import { Addr } from "@/components/Addr";
import { Badge, Bar, Card, Empty, ErrorBox, Notice, toneOfSeverity } from "@/components/ui";
import { VenueIcon } from "@/components/VenueIcon";
import { FlowChart } from "@/components/FlowChart";
import { DataError, getSection } from "@/lib/data";
import { cn, num, pct, price, usd } from "@/lib/format";
import { NETWORKS, type NetworkId } from "@/lib/networks";
import type { ContractOverview } from "@/lib/types";
import type { MarketsData } from "@/lib/api-types";

async function load<T>(fn: () => Promise<T>): Promise<{ data: T } | { error: DataError }> {
  try {
    return { data: await fn() };
  } catch (e) {
    return { error: e instanceof DataError ? e : new DataError("UPSTREAM", "", 500) };
  }
}

const explorer = (network: NetworkId, a: string) => `${NETWORKS[network].explorer}/address/${a}`;

/** A number with a quiet label — no boxes, no nested borders. */
function Metric({ label, value, sub, tone, className }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "ok" | "warn" | "crit"; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-sm text-silver-2">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums text-silver-1", tone === "ok" && "text-ok", tone === "warn" && "text-warn", tone === "crit" && "text-crit")}>{value}</div>
      {sub && <div className="mt-1 text-sm text-silver-2">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- overview

export function OverviewSection({ o, markets }: { o: ContractOverview; markets: MarketsData | null }) {
  const t = useTranslations("Token");
  const locale = useLocale() as Locale;
  const m = o.market;
  const change = m?.change1dPct;
  const volume = markets?.volume24hUsd ?? m?.volume1dUsd ?? null;
  return (
    <section className="border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {m?.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.iconUrl} alt="" width={48} height={48} loading="lazy" decoding="async" className="rounded-full" />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center bg-surface-2 text-lg font-semibold text-silver-1" aria-hidden>
              {(o.symbol ?? o.name ?? "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight">
              {o.name ?? t("noName")}
              {o.symbol && <span className="ml-2 text-silver-2">{o.symbol}</span>}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-silver-2">
              <Addr value={o.address} href={explorer(o.network, o.address)} />
              <span>{NETWORKS[o.network].label}</span>
              <span>{t.has(`kind.${o.kind}`) ? t(`kind.${o.kind}`) : o.kindLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {o.verification.sourceVerified === true && <Badge tone="ok">{t("codeOpen")}</Badge>}
          {o.verification.sourceVerified === false && <Badge tone="crit">{t("codeClosed")}</Badge>}
          {o.proxy.isProxy && <Badge tone="warn">{t("upgradeable")}</Badge>}
          {o.owner && <Badge tone={o.ownerIsContract ? "muted" : "warn"}>{o.ownerIsContract ? t("ownerContract") : t("hasOwner")}</Badge>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
        <Metric
          label={t("price")}
          value={price(m?.priceUsd ?? markets?.priceUsd ?? null, locale)}
          sub={change != null ? <span className={change >= 0 ? "text-ok" : "text-crit"}>{t("perDay", { value: `${change > 0 ? "+" : ""}${pct(change)}` })}</span> : undefined}
        />
        <Metric label={t("mcap")} value={usd(m?.marketCapUsd ?? markets?.marketCapUsd ?? null, true, locale)} />
        <Metric label={t("vol24")} value={usd(volume, true, locale)} />
        <Metric label={t("supply")} value={num(o.totalSupply, locale)} />
      </div>

      {o.owner && (
        <p className="mt-5 flex flex-wrap items-center gap-2 border-t border-line/60 pt-4 text-sm text-silver-2">
          {t("owner")}: <Addr value={o.owner} href={explorer(o.network, o.owner)} /> {o.ownerIsContract ? t("ownerIsContract") : t("ownerIsWallet")}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- markets (CEX + DEX)

export function MarketsSection({ m, failed = false }: { m: MarketsData | null; failed?: boolean }) {
  const t = useTranslations("Token");
  const locale = useLocale() as Locale;
  const $ = (v: number | null | undefined) => usd(v, true, locale);
  if (!m || m.markets.length === 0)
    return (
      <Card title={t("whereTitle")}>
        <Notice tone="warn">{failed ? t("cgFailed") : t("noMarkets")}</Notice>
      </Card>
    );
  const cex = m.markets.filter((x) => x.type === "cex").length;
  const total = m.cexVolumeUsd + m.dexVolumeUsd || 1;
  const top = m.markets[0];
  return (
    <Card
      title={t("whereTitle")}
      right={
        <a href={m.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1 text-sm">
          CoinGecko <ExternalLink className="size-3.5" aria-hidden />
        </a>
      }
    >
      <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
        <Metric label={t("vol24")} value={$(m.volume24hUsd)} />
        <Metric label={t("cex")} value={pct((m.cexVolumeUsd / total) * 100, 0)} sub={t("venues", { count: cex })} />
        <Metric label={t("dex")} value={pct((m.dexVolumeUsd / total) * 100, 0)} sub={t("venues", { count: m.markets.length - cex })} />
        <Metric
          label={t("topVenue")}
          value={
            <span className="inline-flex items-center gap-1.5">
              <VenueIcon name={top.exchange} size="sm" />
              <span className="truncate">{top.exchange}</span>
            </span>
          }
          sub={t("ofVolume", { pct: pct(top.volumeSharePct, 0) })}
        />
      </div>

      <ul className="mt-5 space-y-2 sm:hidden">
        {m.markets.slice(0, 20).map((x, i) => (
          <li key={`${x.exchange}-${x.pair}-${i}`} className="border border-line px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <VenueIcon name={x.exchange} size="xs" />
                <span className="truncate text-silver-1">{x.exchange}</span>
              </span>
              <span className="shrink-0 tabular-nums text-silver-1">{$(x.volumeUsd)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3 text-sm text-silver-2">
              <span>{x.pair}</span>
              <span className="flex shrink-0 gap-3 tabular-nums">
                <span>{price(x.priceUsd, locale)}</span>
                <span>{pct(x.volumeSharePct, 1)}</span>
              </span>
            </div>
            {(x.stale || x.anomaly) && <div className="mt-1 text-sm text-warn">{x.anomaly ? t("anomaly") : t("stale")}</div>}
          </li>
        ))}
      </ul>
      <div className="mt-5 hidden overflow-x-auto sm:block">
        <table className="table">
          <thead>
            <tr>
              <th>{t("colVenue")}</th>
              <th>{t("colPair")}</th>
              <th className="hidden text-right sm:table-cell">{t("colPrice")}</th>
              <th className="text-right">{t("colVol")}</th>
              <th className="hidden text-right sm:table-cell">{t("colShare")}</th>
            </tr>
          </thead>
          <tbody>
            {m.markets.slice(0, 20).map((x, i) => (
              <tr key={`${x.exchange}-${x.pair}-${i}`}>
                <td className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <VenueIcon name={x.exchange} size="xs" />
                    {x.exchange}
                  </span>
                  {(x.stale || x.anomaly) && <Badge tone="warn" className="ml-2">{x.anomaly ? t("anomaly") : t("stale")}</Badge>}
                </td>
                <td className="whitespace-nowrap">
                  {x.url ? (
                    <a href={x.url} target="_blank" rel="noopener noreferrer" className="link">
                      {x.pair}
                    </a>
                  ) : (
                    x.pair
                  )}
                </td>
                <td className="hidden text-right tabular-nums sm:table-cell">{price(x.priceUsd, locale)}</td>
                <td className="text-right tabular-nums">{$(x.volumeUsd)}</td>
                <td className="hidden text-right tabular-nums sm:table-cell">{pct(x.volumeSharePct, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- risk

export async function RiskSection({ address, network }: { address: string; network: NetworkId }) {
  const t = await getTranslations("Token");
  const tRisk = await getTranslations("RiskFactor");
  const r = await load(() => getSection("risk", address, network));
  if ("error" in r) return <Card title={t("risksTitle")}><ErrorBox code={r.error.code} message={r.error.message} /></Card>;
  const risk = r.data;
  const tone = risk.level === "low" ? "ok" : risk.level === "moderate" ? "warn" : "crit";
  const stable = !!risk.context?.includes("stablecoin");
  const title = t(({ low: "lvLow", moderate: "lvModerate", high: "lvHigh", critical: "lvCritical" } as const)[risk.level]);
  return (
    <Card
      title={t("risksTitle")}
      hint={t("risksHint")}
      right={
        // a stablecoin's main risk (the issuer's reserves) cannot be read from the chain: a bare "Low · 0/100" would overstate it
        stable ? <Badge tone="info">{t("partialBadge", { score: risk.score })}</Badge> : <Badge tone={tone}>{title} · {risk.score}/100</Badge>
      }
    >
      <ul className="space-y-4">
        {risk.factors.map((f) => {
          const known = tRisk.has(f.key);
          const share = f.max ? f.points / f.max : 0;
          return (
            <li key={f.key}>
              <div className="flex items-baseline justify-between gap-3 text-base">
                <span className="text-silver-1">{known ? tRisk(`${f.key}.name`) : f.label}</span>
                <span className="tabular-nums text-silver-2">{f.points}/{f.max}</span>
              </div>
              <div className="mt-2">
                <Bar value={f.points} max={f.max} tone={share >= 0.6 ? "crit" : share >= 0.3 ? "warn" : "ok"} />
              </div>
              {known && f.points > 0 && <p className="mt-1.5 text-sm leading-relaxed text-silver-2">{tRisk(`${f.key}.about`)}</p>}
            </li>
          );
        })}
      </ul>
      <RiskContext codes={risk.context} />
      <Link href={`/check?address=${address}&network=${network}`} className="link mt-5 inline-block text-sm">
        {t("checkAddr")}
      </Link>
    </Card>
  );
}

// ---------------------------------------------------------------- liquidity

export async function LiquiditySection({ address, network }: { address: string; network: NetworkId }) {
  const t = await getTranslations("Token");
  const locale = (await getLocale()) as Locale;
  const r = await load(() => getSection("liquidity", address, network));
  if ("error" in r) return <Card title={t("poolsTitle")}><ErrorBox code={r.error.code} message={r.error.message} /></Card>;
  const l = r.data;
  const ratio = l.tvlToMarketCap;
  const priced = l.pools.filter((p) => p.tvlUsd != null && p.tvlUsd >= 1);
  return (
    <Card title={t("poolsTitle")}>
      <div className="grid grid-cols-2 gap-5">
        <Metric label={t("inPools")} value={usd(l.totalTvlUsd, true, locale)} />
        <Metric label={t("sellBuffer")} value={ratio != null ? pct(ratio * 100, 2) : "—"} tone={ratio == null ? undefined : ratio < 0.02 ? "crit" : ratio < 0.05 ? "warn" : "ok"} />
      </div>
      {l.pools.length === 0 ? (
        <Notice tone="warn">{t("noPools")}</Notice>
      ) : priced.length === 0 ? null : (
        <>
          <ul className="mt-5 space-y-2 sm:hidden">
            {priced.slice(0, 8).map((p) => (
              <li key={p.address} className="border border-line px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <VenueIcon name={p.dex} size="xs" />
                    <span className="truncate text-silver-1">{p.dex}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-silver-1">{usd(p.tvlUsd, true, locale)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-sm text-silver-2">
                  <span>{p.token0.symbol}/{p.token1.symbol}</span>
                  {p.feeBps != null && <span className="tabular-nums">{p.feeBps / 100}%</span>}
                </div>
              </li>
            ))}
          </ul>
        <div className="mt-5 hidden overflow-x-auto sm:block">
          <table className="table">
            <thead>
              <tr>
                <th>{t("colVenue")}</th>
                <th>{t("colPair")}</th>
                <th className="text-right">{t("colPoolSize")}</th>
              </tr>
            </thead>
            <tbody>
              {priced.slice(0, 8).map((p) => (
                <tr key={p.address}>
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <VenueIcon name={p.dex} size="xs" />
                      {p.dex}
                    </span>
                    {p.feeBps != null && <span className="ml-2 text-sm text-silver-2">{p.feeBps / 100}%</span>}
                  </td>
                  <td className="text-silver-2">
                    {p.token0.symbol}/{p.token1.symbol}
                  </td>
                  <td className="text-right tabular-nums">
                    {usd(p.tvlUsd, true, locale)}
                    {p.tvlEstimated && <span className="text-silver-3">*</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- trading

export async function TradingSection({ address, network }: { address: string; network: NetworkId }) {
  const t = await getTranslations("Token");
  const locale = (await getLocale()) as Locale;
  const r = await load(() => getSection("trading", address, network, { window: "24h" }));
  if ("error" in r) return <Card title={t("tradingTitle")}><ErrorBox code={r.error.code} message={r.error.message} /></Card>;
  const tr = r.data;
  const s = tr.summary;
  const bp = s.buyPressurePct;
  return (
    <Card title={t("tradingTitle")}>
      <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
        <Metric label={t("bought")} value={usd(s.buyUsd, true, locale)} tone="ok" sub={t("trades", { count: s.buyCount })} />
        <Metric label={t("sold")} value={usd(s.sellUsd, true, locale)} tone="crit" sub={t("trades", { count: s.sellCount })} />
        <Metric label={t("buyShare")} value={bp != null ? pct(bp, 0) : "—"} sub={bp == null ? undefined : bp >= 55 ? t("moreBuy") : bp <= 45 ? t("moreSell") : t("even")} />
        <Metric label={t("transfers")} value={num(s.transferCount, locale)} sub={t("worth", { value: usd(s.transferVolumeUsd, true, locale) })} />
      </div>
      <div className="mt-6">
        {tr.buckets.length > 0 ? <FlowChart buckets={tr.buckets} /> : <Empty>{t("noTrades")}</Empty>}
      </div>
      {tr.coverage.coveredSec < tr.coverage.requestedWindowSec * 0.95 && (
        <p className="mt-3 text-sm text-silver-2">{t("period", { hours: Math.round(tr.coverage.coveredSec / 3600) })}</p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- holders

export async function HoldersSection({ address, network }: { address: string; network: NetworkId }) {
  const t = await getTranslations("Token");
  const tKind = await getTranslations("Holder");
  const tCat = await getTranslations("Category");
  const locale = (await getLocale()) as Locale;
  const r = await load(() => getSection("holders", address, network, { topN: 25 }));
  if ("error" in r) return <Card title={t("holdersTitle")}><ErrorBox code={r.error.code} message={r.error.message} /></Card>;
  const h = r.data;
  const c = h.concentration;
  const labels = h.labels ?? {};
  return (
    <Card title={t("holdersTitle")}>
      <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
        <Metric label={t("top1")} value={pct(c.top1Pct)} />
        <Metric label={t("top10")} value={pct(c.top10Pct)} />
        <Metric label={t("top10adj")} value={pct(c.top10AdjustedPct)} tone={c.top10AdjustedPct > 50 ? "crit" : c.top10AdjustedPct > 25 ? "warn" : "ok"} />
        <Metric label={t("control")} value={c.nakamoto != null ? t("addrs", { count: c.nakamoto }) : ">25"} sub={t("half")} />
      </div>

      <ul className="mt-5 space-y-2 sm:hidden">
        {h.holders.slice(0, 25).map((x) => {
          const tag = labels[x.address.toLowerCase()];
          return (
            <li key={x.address} className="border border-line px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <Addr value={x.address} href={explorer(network, x.address)} />
                <span className="shrink-0 tabular-nums text-silver-1">{pct(x.pctSupply, 2)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-silver-2">
                <span>{x.label ?? (tag?.severity === 0 ? tag.label : tKind(x.kind))}</span>
                {tag && tag.severity > 0 && <Badge tone={toneOfSeverity(tag.severity)}>{tCat.has(tag.category) ? tCat(`${tag.category}.name`) : tag.category}</Badge>}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 hidden overflow-x-auto sm:block">
        <table className="table">
          <thead>
            <tr>
              <th>{t("colAddress")}</th>
              <th>{t("colWho")}</th>
              <th className="text-right">{t("colHolderShare")}</th>
              <th className="hidden text-right sm:table-cell">{t("colValue")}</th>
            </tr>
          </thead>
          <tbody>
            {h.holders.slice(0, 25).map((x) => {
              const tag = labels[x.address.toLowerCase()];
              return (
                <tr key={x.address}>
                  <td>
                    <Addr value={x.address} href={explorer(network, x.address)} />
                  </td>
                  <td>
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="text-silver-2">{x.label ?? (tag?.severity === 0 ? tag.label : tKind(x.kind))}</span>
                      {tag && tag.severity > 0 && <Badge tone={toneOfSeverity(tag.severity)}>{tCat.has(tag.category) ? tCat(`${tag.category}.name`) : tag.category}</Badge>}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{pct(x.pctSupply, 2)}</td>
                  <td className="hidden text-right tabular-nums sm:table-cell">{usd(x.valueUsd, true, locale)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-silver-2">{t("holdersFoot")}</p>
    </Card>
  );
}
