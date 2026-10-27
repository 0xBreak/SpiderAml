import type { Metadata } from "next";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { Addr } from "@/components/Addr";
import { SearchForm } from "@/components/SearchForm";
import { Badge, Card, CardSkeleton, Empty, ErrorBox, PageTitle, Stat, toneOfSeverity } from "@/components/ui";
import { DataError, getWhales, limit } from "@/lib/data";
import { trackEvent } from "@/lib/metrics";
import { dateTime, num, usd } from "@/lib/format";
import { NETWORKS, isNetworkId, type NetworkId } from "@/lib/networks";
import { CATEGORY } from "@/lib/texts";
import type { HolderKind, WhaleTransferKind } from "@/lib/types";

export const metadata: Metadata = { title: "Киты" };
export const dynamic = "force-dynamic";

type SP = Promise<{ address?: string; network?: string; usd?: string; window?: string }>;

const WINDOWS = { "1h": "1 час", "6h": "6 часов", "24h": "24 часа", "7d": "7 дней" } as const;
const PRESETS = [10_000, 50_000, 100_000, 500_000, 1_000_000];
const TYPE: Record<WhaleTransferKind, { label: string; tone: "ok" | "crit" | "muted" | "info" }> = {
  buy: { label: "Покупка", tone: "ok" },
  sell: { label: "Продажа", tone: "crit" },
  transfer: { label: "Перевод", tone: "muted" },
  mint: { label: "Выпуск", tone: "info" },
  burn: { label: "Сжигание", tone: "muted" },
};
const KIND: Record<HolderKind, string> = { eoa: "Кошелёк", multisig: "Мультисиг", contract: "Контракт", pool: "Пул DEX", burn: "Сожжено", token: "Сам токен" };

export default async function WhalesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const network = sp.network && isNetworkId(sp.network) ? sp.network : "ethereum";
  const threshold = Math.min(1e9, Math.max(100, Number(sp.usd) || 50_000));
  const window = (sp.window && sp.window in WINDOWS ? sp.window : "24h") as keyof typeof WINDOWS;

  return (
    <div className="space-y-5">
      <PageTitle title="Киты" sub="Крупные переводы выбранного токена дороже суммы, которую вы зададите: кто покупает, кто продаёт и сколько." />
      <SearchForm action="/whales" address={sp.address} network={network} placeholder="Адрес токена 0x…" button="Показать">
        <label className="sm:w-36">
          <span className="sr-only">Порог</span>
          <select name="usd" defaultValue={String(threshold)} className="input">
            {[...new Set([...PRESETS, threshold])].sort((a, b) => a - b).map((p) => (
              <option key={p} value={p}>
                от {usd(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:w-32">
          <span className="sr-only">Период</span>
          <select name="window" defaultValue={window} className="input">
            {Object.entries(WINDOWS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </SearchForm>
      {sp.address ? (
        <Suspense key={`${sp.address}-${network}-${threshold}-${window}`} fallback={<CardSkeleton title="Ищем крупные переводы… это может занять до минуты" lines={10} />}>
          <Report address={sp.address.trim()} network={network} threshold={threshold} window={window} />
        </Suspense>
      ) : (
        <Card>
          <p className="text-sm text-silver-2">
            Вставьте адрес токена, например USDT в Ethereum: <code className="font-mono text-silver-1">0xdAC17F958D2ee523a2206206994597C13D831ec7</code>. Для популярных токенов с огромным числом переводов
            мы просматриваем столько истории, сколько успеваем, и показываем, какой период охвачен.
          </p>
        </Card>
      )}
    </div>
  );
}

async function Report({ address, network, threshold, window }: { address: string; network: NetworkId; threshold: number; window: keyof typeof WINDOWS }) {
  let r: Awaited<ReturnType<typeof getWhales>>;
  try {
    await limit("whales", 6);
    r = await getWhales(address, network, threshold, window);
    trackEvent("whales", network, "/whales");
  } catch (e) {
    const err = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
    return <ErrorBox code={err.code} message={err.message} />;
  }
  const ex = NETWORKS[network].explorer;
  const s = r.summary;
  const covered = r.coverage.coveredSec / r.coverage.requestedWindowSec;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Крупных переводов" value={num(s.transfers)} sub={`${r.token.symbol ?? "токен"} от ${usd(r.thresholdUsd)}`} />
        <Stat label="Кошельков" value={num(s.wallets)} />
        <Stat label="Куплено на DEX" value={usd(s.dexBuyUsd)} tone="ok" />
        <Stat label="Продано на DEX" value={usd(s.dexSellUsd)} tone="crit" />
      </div>
      {r.thresholdBasis === "supply" && <p className="text-sm text-warn">У токена нет цены, поэтому «крупным» считается перевод больше 0,1% от всех токенов.</p>}
      {covered < 0.95 && (
        <p className="text-sm text-silver-3">
          Просмотрено {Math.max(1, Math.round(r.coverage.coveredSec / 3600))} ч из выбранного периода: у токена очень много переводов. Повторите запрос, чтобы просмотреть глубже.
        </p>
      )}

      <Card title="Кошельки китов" hint="По объёму крупных переводов за период. Метки — из открытых баз.">
        {r.wallets.length === 0 ? (
          <Empty>За этот период переводов дороже {usd(r.thresholdUsd)} не найдено. Попробуйте уменьшить порог или увеличить период.</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="table md:min-w-[720px]">
              <thead>
                <tr>
                  <th>Кошелёк</th>
                  <th>Кто это</th>
                  <th className="hidden text-right md:table-cell">Получил</th>
                  <th className="hidden text-right md:table-cell">Отправил</th>
                  <th className="text-right">Итог</th>
                </tr>
              </thead>
              <tbody>
                {r.wallets.slice(0, 50).map((w) => {
                  const tag = r.labels[w.address.toLowerCase()];
                  return (
                    <tr key={w.address}>
                      <td>
                        <Addr value={w.address} href={`${ex}/address/${w.address}`} />
                      </td>
                      <td className="space-x-1.5">
                        <span className="text-silver-2">{w.label ?? (tag?.severity === 0 ? tag.label : KIND[w.kind])}</span>
                        {tag && tag.severity > 0 && <Badge tone={toneOfSeverity(tag.severity)}>{CATEGORY[tag.category].name}</Badge>}
                      </td>
                      <td className="hidden text-right tabular-nums text-ok md:table-cell">{usd(w.inUsd)}</td>
                      <td className="hidden text-right tabular-nums text-crit md:table-cell">{usd(w.outUsd)}</td>
                      <td className={`text-right tabular-nums ${(w.netUsd ?? 0) >= 0 ? "text-ok" : "text-crit"}`}>{usd(w.netUsd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {r.transfers.length > 0 && (
        <Card title="Самые крупные переводы">
          <ul className="divide-y divide-line/60 text-sm">
            {r.transfers.slice(0, 30).map((t) => (
              <li key={t.tx + t.from + t.to} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <Badge tone={TYPE[t.type].tone}>{TYPE[t.type].label}</Badge>
                <span className="font-semibold tabular-nums">{usd(t.usd, false)}</span>
                <span className="text-silver-3">
                  {num(t.tokens)} {r.token.symbol}
                </span>
                <span className="flex items-center gap-1 text-silver-2">
                  <Addr value={t.from} /> → <Addr value={t.to} />
                </span>
                <span className="ml-auto flex items-center gap-2 text-xs text-silver-3">
                  {dateTime(t.ts * 1000)}
                  <a href={`${ex}/tx/${t.tx}`} target="_blank" rel="noopener noreferrer" aria-label="Транзакция" className="hover:text-silver-1">
                    <ExternalLink className="size-3.5" />
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
