// AML page blocks. Each async block fetches its own section from the data layer; a failure stays inside its card.
import Link from "next/link";
import { Addr } from "@/components/Addr";
import { Badge, Bar, Card, Empty, ErrorBox, Notice, Stat, toneOfSeverity } from "@/components/ui";
import { FlowChart } from "@/components/FlowChart";
import { DataError, getSection } from "@/lib/data";
import { num, pct, price, usd } from "@/lib/format";
import { NETWORKS, type NetworkId } from "@/lib/networks";
import { CATEGORY, RISK_FACTOR } from "@/lib/texts";
import type { ContractOverview, HolderKind } from "@/lib/types";
import type { MarketsData } from "@/lib/api-types";
import { ExternalLink } from "lucide-react";

const KIND: Record<string, string> = {
  erc20: "Токен ERC-20",
  "lp-v2": "Пул ликвидности (V2)",
  "lp-v3": "Пул ликвидности (V3)",
  "vault-4626": "Хранилище (ERC-4626)",
  staking: "Стейкинг",
  erc721: "NFT (ERC-721)",
  erc1155: "NFT (ERC-1155)",
  other: "Контракт",
};

const HOLDER_KIND: Record<HolderKind, string> = { eoa: "Кошелёк", multisig: "Мультисиг", contract: "Контракт", pool: "Пул DEX", burn: "Сожжено", token: "Сам токен" };

async function load<T>(fn: () => Promise<T>): Promise<{ data: T } | { error: DataError }> {
  try {
    return { data: await fn() };
  } catch (e) {
    return { error: e instanceof DataError ? e : new DataError("UPSTREAM", "", 500) };
  }
}

const explorer = (network: NetworkId, a: string) => `${NETWORKS[network].explorer}/address/${a}`;

// ---------------------------------------------------------------- overview

export function OverviewSection({ o, markets }: { o: ContractOverview; markets: MarketsData | null }) {
  const m = o.market;
  const change = m?.change1dPct;
  // CoinGecko sees centralised exchanges too, so its 24h volume is the honest number when we have it
  const volume = markets?.volume24hUsd ?? m?.volume1dUsd ?? null;
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-3">
        {m?.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.iconUrl} alt="" width={36} height={36} className="rounded-full" />
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">
            {o.name ?? "Без названия"} {o.symbol && <span className="text-silver-3">{o.symbol}</span>}
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-silver-3">
            <Addr value={o.address} href={explorer(o.network, o.address)} />
            <span>· {NETWORKS[o.network].label}</span>
            <span>· {KIND[o.kind] ?? o.kindLabel}</span>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {o.verification.sourceVerified === true && <Badge tone="ok">Код опубликован</Badge>}
          {o.verification.sourceVerified === false && <Badge tone="crit">Код не опубликован</Badge>}
          {o.proxy.isProxy && <Badge tone="warn">Обновляемый контракт</Badge>}
          {o.owner && <Badge tone={o.ownerIsContract ? "muted" : "warn"}>{o.ownerIsContract ? "Владелец — контракт" : "Есть владелец"}</Badge>}
          {m?.verifiedByZerion && <Badge tone="info">Проверен Zerion</Badge>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Цена" value={price(m?.priceUsd ?? markets?.priceUsd ?? null)} sub={change != null ? <span className={change >= 0 ? "text-ok" : "text-crit"}>за сутки {change > 0 ? "+" : ""}{pct(change)}</span> : undefined} />
        <Stat label="Капитализация" value={usd(m?.marketCapUsd ?? markets?.marketCapUsd ?? null)} sub={m?.fdvUsd ? `FDV ${usd(m.fdvUsd)}` : undefined} />
        <Stat label="Объём торгов за сутки" value={usd(volume)} sub={markets ? "биржи и DEX, CoinGecko" : "по данным Zerion"} />
        <Stat label="Всего токенов" value={num(o.totalSupply)} />
      </div>
      {o.owner && (
        <p className="mt-3 text-sm text-silver-2">
          Владелец контракта: <Addr value={o.owner} href={explorer(o.network, o.owner)} />
          {!o.ownerIsContract && " — обычный кошелёк. Один человек может менять настройки токена, если контракт это позволяет."}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- markets (CEX + DEX)

export function MarketsSection({ m }: { m: MarketsData | null }) {
  if (!m || m.markets.length === 0)
    return (
      <Card title="Где торгуется">
        <Notice tone="warn">CoinGecko не знает этот токен — у него нет торгов на известных биржах. Ниже только данные из блокчейна.</Notice>
      </Card>
    );
  const cex = m.markets.filter((x) => x.type === "cex").length;
  return (
    <Card
      title="Где торгуется"
      hint="Биржи (CEX) и обменники в блокчейне (DEX) за последние 24 часа. Глубина ±2% — сколько долларов нужно, чтобы сдвинуть цену на 2%: чем больше, тем легче купить или продать без потерь."
      right={
        <a href={m.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1 text-sm">
          CoinGecko <ExternalLink className="size-3.5" />
        </a>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Объём за сутки" value={usd(m.volume24hUsd)} />
        <Stat label="На биржах (CEX)" value={usd(m.cexVolumeUsd)} sub={`${cex} площад.`} />
        <Stat label="На DEX" value={usd(m.dexVolumeUsd)} sub={`${m.markets.length - cex} площад.`} />
        <Stat label="Главная площадка" value={m.markets[0].exchange} sub={`${pct(m.markets[0].volumeSharePct, 0)} объёма`} />
      </div>
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="table min-w-[860px]">
          <thead>
            <tr>
              <th>#</th>
              <th>Площадка</th>
              <th>Пара</th>
              <th className="text-right">Цена</th>
              <th className="text-right">Спред</th>
              <th className="text-right">Глубина +2%</th>
              <th className="text-right">Глубина −2%</th>
              <th className="text-right">Объём 24ч</th>
              <th className="text-right">Доля</th>
            </tr>
          </thead>
          <tbody>
            {m.markets.slice(0, 20).map((x, i) => (
              <tr key={`${x.exchange}-${x.pair}-${i}`}>
                <td className="text-silver-3">{i + 1}</td>
                <td className="whitespace-nowrap">
                  {x.exchange} <Badge tone={x.type === "cex" ? "info" : "muted"}>{x.type.toUpperCase()}</Badge>
                  {(x.stale || x.anomaly) && (
                    <Badge tone="warn" className="ml-1">
                      {x.anomaly ? "аномалия" : "давно не обновлялось"}
                    </Badge>
                  )}
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
                <td className="text-right tabular-nums">{price(x.priceUsd)}</td>
                <td className="text-right tabular-nums">{x.spreadPct != null ? pct(x.spreadPct, 2) : "—"}</td>
                <td className="text-right tabular-nums">{usd(x.depthUpUsd)}</td>
                <td className="text-right tabular-nums">{usd(x.depthDownUsd)}</td>
                <td className="text-right tabular-nums">{usd(x.volumeUsd)}</td>
                <td className="text-right tabular-nums">{pct(x.volumeSharePct, 2)}</td>
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
  const r = await load(() => getSection("risk", address, network));
  if ("error" in r) return <Card title="Риски"><ErrorBox code={r.error.code} message={r.error.message} /></Card>;
  const risk = r.data;
  const tone = risk.level === "low" ? "ok" : risk.level === "moderate" ? "warn" : "crit";
  const title = { low: "Низкий", moderate: "Умеренный", high: "Высокий", critical: "Критический" }[risk.level];
  return (
    <Card title="Риски" hint="Автоматическая оценка по признакам контракта. Не аудит." right={<Badge tone={tone}>{title} · {risk.score}/100</Badge>}>
      <ul className="space-y-3">
        {risk.factors.map((f) => {
          const t = RISK_FACTOR[f.key];
          const share = f.max ? f.points / f.max : 0;
          return (
            <li key={f.key}>
              <div className="flex justify-between text-sm">
                <span>{t?.name ?? f.label}</span>
                <span className="tabular-nums text-silver-3">
                  {f.points}/{f.max}
                </span>
              </div>
              <div className="my-1.5">
                <Bar value={f.points} max={f.max} tone={share >= 0.6 ? "crit" : share >= 0.3 ? "warn" : "ok"} />
              </div>
              {t && <p className="text-xs text-silver-3">{t.about}</p>}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 text-sm">
        <Link href={`/check?address=${address}&network=${network}`} className="link">
          AML-проверка адреса по санкциям и базам рисков →
        </Link>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- liquidity

export async function LiquiditySection({ address, network }: { address: string; network: NetworkId }) {
  const r = await load(() => getSection("liquidity", address, network));
  if ("error" in r) return <Card title="Ликвидность"><ErrorBox code={r.error.code} message={r.error.message} /></Card>;
  const l = r.data;
  const ratio = l.tvlToMarketCap;
  const priced = l.pools.filter((p) => p.tvlUsd != null && p.tvlUsd >= 1);
  const unpriced = l.pools.length - priced.length;
  return (
    <Card title="Ликвидность в пулах DEX" hint="Сколько денег лежит в пулах обмена в блокчейне — от этого зависит, получится ли продать без больших потерь.">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Stat label="В пулах всего" value={usd(l.totalTvlUsd)} />
        <Stat label="От капитализации" value={ratio != null ? pct(ratio * 100, 2) : "—"} tone={ratio == null ? undefined : ratio < 0.02 ? "crit" : ratio < 0.05 ? "warn" : "ok"} />
      </div>
      {l.pools.length === 0 ? (
        <Notice tone="warn">Пулы обмена не найдены. Продать такой токен может быть невозможно.</Notice>
      ) : priced.length === 0 ? null : (
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="table">
            <thead>
              <tr>
                <th>Площадка</th>
                <th>Пара</th>
                <th className="text-right">Объём пула</th>
              </tr>
            </thead>
            <tbody>
              {priced.slice(0, 8).map((p) => (
                <tr key={p.address}>
                  <td>
                    {p.dex}
                    {p.feeBps != null && <span className="text-silver-3"> · {(p.feeBps / 100).toFixed(2)}%</span>}
                  </td>
                  <td className="text-silver-2">
                    {p.token0.symbol}/{p.token1.symbol}
                  </td>
                  <td className="text-right tabular-nums">
                    {usd(p.tvlUsd)}
                    {p.tvlEstimated && <span className="text-silver-3">*</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {unpriced > 0 && <p className="mt-2 text-xs text-silver-3">Ещё {unpriced} пул(ов) с токенами без цены — их объём нельзя оценить в долларах.</p>}
      <p className="mt-2 text-xs text-silver-3">Uniswap, Sushi, PancakeSwap и другие DEX. Ликвидность бирж (CEX) — в блоке «Где торгуется», колонки «Глубина».</p>
    </Card>
  );
}

// ---------------------------------------------------------------- trading

export async function TradingSection({ address, network }: { address: string; network: NetworkId }) {
  const r = await load(() => getSection("trading", address, network, { window: "24h" }));
  if ("error" in r) return <Card title="Покупки и продажи за сутки"><ErrorBox code={r.error.code} message={r.error.message} /></Card>;
  const t = r.data;
  const s = t.summary;
  const bp = s.buyPressurePct;
  return (
    <Card title="Покупки и продажи за сутки" hint="Сделки через пулы обмена (DEX) по данным блокчейна.">
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Купили" value={usd(s.buyUsd)} sub={`${s.buyCount} сделок · ${s.uniqueBuyers} покупателей`} tone="ok" />
        <Stat label="Продали" value={usd(s.sellUsd)} sub={`${s.sellCount} сделок · ${s.uniqueSellers} продавцов`} tone="crit" />
        <Stat label="Доля покупок" value={bp != null ? pct(bp, 0) : "—"} sub={bp == null ? undefined : bp >= 55 ? "покупают больше" : bp <= 45 ? "продают больше" : "примерно поровну"} />
        <Stat label="Переводов" value={num(s.transferCount)} sub={`на ${usd(s.transferVolumeUsd)}`} />
      </div>
      {t.buckets.length > 0 ? <FlowChart buckets={t.buckets} /> : <Empty>За сутки сделок через DEX не найдено.</Empty>}
      {t.coverage.coveredSec < t.coverage.requestedWindowSec * 0.95 && (
        <p className="mt-2 text-xs text-silver-3">Показан период {Math.round(t.coverage.coveredSec / 3600)} ч из 24 — у токена очень много переводов.</p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- holders

export async function HoldersSection({ address, network }: { address: string; network: NetworkId }) {
  const r = await load(() => getSection("holders", address, network, { topN: 25 }));
  if ("error" in r) return <Card title="Крупные держатели"><ErrorBox code={r.error.code} message={r.error.message} /></Card>;
  const h = r.data;
  const c = h.concentration;
  const labels = h.labels ?? {};
  return (
    <Card title="Крупные держатели" hint="Кому принадлежит больше всего токенов. Пулы и сожжённые токены отмечены отдельно.">
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Топ-1" value={pct(c.top1Pct)} />
        <Stat label="Топ-10" value={pct(c.top10Pct)} />
        <Stat label="Топ-10 без пулов" value={pct(c.top10AdjustedPct)} tone={c.top10AdjustedPct > 50 ? "crit" : c.top10AdjustedPct > 25 ? "warn" : "ok"} />
        <Stat label="Контроль 50%" value={c.nakamoto != null ? `${c.nakamoto} адр.` : ">25"} sub="столько кошельков держат половину" />
      </div>
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="table min-w-[640px]">
          <thead>
            <tr>
              <th>#</th>
              <th>Адрес</th>
              <th>Кто это</th>
              <th className="text-right">Доля</th>
              <th className="text-right">Стоимость</th>
            </tr>
          </thead>
          <tbody>
            {h.holders.slice(0, 25).map((x) => {
              const tag = labels[x.address.toLowerCase()];
              return (
                <tr key={x.address}>
                  <td className="text-silver-3">{x.rank}</td>
                  <td>
                    <Addr value={x.address} href={explorer(network, x.address)} />
                  </td>
                  <td className="space-x-1.5">
                    <span className="text-silver-2">{x.label ?? (tag?.severity === 0 ? tag.label : HOLDER_KIND[x.kind])}</span>
                    {tag && tag.severity > 0 && <Badge tone={toneOfSeverity(tag.severity)}>{CATEGORY[tag.category].name}</Badge>}
                  </td>
                  <td className="text-right tabular-nums">{pct(x.pctSupply, 2)}</td>
                  <td className="text-right tabular-nums">{usd(x.valueUsd)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-silver-3">
        Держатели найдены по переводам за последние недели — давно не двигавшиеся кошельки могут не попасть в список.
      </p>
    </Card>
  );
}
