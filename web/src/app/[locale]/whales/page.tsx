import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowDownUp, ArrowRight, Coins, Droplets, ExternalLink, Tag } from "lucide-react";
import { Addr } from "@/components/Addr";
import { SearchForm } from "@/components/SearchForm";
import { Badge, Card, CardSkeleton, Empty, ErrorBox, PageTitle, Stat } from "@/components/ui";
import { WhalesTable } from "./WhalesTable";
import { DataError, getWhales, limit } from "@/lib/data";
import { trackEvent } from "@/lib/metrics";
import { dateTime, num, usd } from "@/lib/format";
import { NETWORKS, isNetworkId, type NetworkId } from "@/lib/networks";
import type { WhaleTransferKind } from "@/lib/types";

export const metadata: Metadata = { title: "Киты" };
export const dynamic = "force-dynamic";

type SP = Promise<{ address?: string; network?: string; usd?: string; window?: string }>;

const WINDOWS = { "1h": "1 час", "6h": "6 часов", "24h": "24 часа", "7d": "7 дней" } as const;
const PRESETS = [10_000, 50_000, 100_000, 500_000, 1_000_000];
const FEATURES = [
  { icon: ArrowDownUp, title: "Крупные переводы" },
  { icon: Coins, title: "Покупки" },
  { icon: Droplets, title: "Продажи" },
  { icon: Tag, title: "Метки" },
];
const TYPE: Record<WhaleTransferKind, { label: string; tone: "ok" | "crit" | "muted" | "info" }> = {
  buy: { label: "Покупка", tone: "ok" },
  sell: { label: "Продажа", tone: "crit" },
  transfer: { label: "Перевод", tone: "muted" },
  mint: { label: "Выпуск", tone: "info" },
  burn: { label: "Сжигание", tone: "muted" },
};

export default async function WhalesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const network = sp.network && isNetworkId(sp.network) ? sp.network : "ethereum";
  const threshold = Math.min(1e9, Math.max(100, Number(sp.usd) || 50_000));
  const window = (sp.window && sp.window in WINDOWS ? sp.window : "24h") as keyof typeof WINDOWS;

  return (
    <div className="space-y-5">
      <PageTitle title="Киты" sub="Кто покупает и продаёт." />
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
        <Suspense key={`${sp.address}-${network}-${threshold}-${window}`} fallback={<CardSkeleton title="Ищем крупные переводы" lines={10} />}>
          <Report address={sp.address.trim()} network={network} threshold={threshold} window={window} />
        </Suspense>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title }) => (
            <div key={title} className="card flex min-h-20 items-center gap-3 border-line/60 bg-surface/60 p-4">
              <Icon className="size-5 shrink-0 text-silver-2" aria-hidden />
              <span className="text-base leading-snug text-silver-1">{title}</span>
            </div>
          ))}
        </div>
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 [&_.label]:text-sm [&_.label]:font-medium [&_.label]:normal-case [&_.label]:tracking-normal [&_.label]:text-silver-2">
        <Stat label="Крупных переводов" value={<span className="text-2xl lg:text-3xl">{num(s.transfers)}</span>} />
        <Stat label="Кошельков" value={<span className="text-2xl lg:text-3xl">{num(s.wallets)}</span>} />
        <Stat
          label="Куплено на DEX"
          value={<span className="text-2xl lg:text-3xl">{usd(s.dexBuyUsd)}</span>}
          tone="ok"
        />
        <Stat
          label="Продано на DEX"
          value={<span className="text-2xl lg:text-3xl">{usd(s.dexSellUsd)}</span>}
          tone="crit"
        />
      </div>
      {r.thresholdBasis === "supply" && <p className="text-base text-warn">У токена нет цены, поэтому «крупным» считается перевод больше 0,1% от всех токенов.</p>}
      {covered < 0.95 && (
        <p className="text-base text-silver-2">
          Просмотрено {Math.max(1, Math.round(r.coverage.coveredSec / 3600))} ч из выбранного периода.
        </p>
      )}

      <Card title="Кошельки китов">
        {r.wallets.length === 0 ? (
          <Empty>
            <span className="text-base text-silver-2">Переводов дороже {usd(r.thresholdUsd)} нет.</span>
          </Empty>
        ) : (
          <WhalesTable wallets={r.wallets.slice(0, 50)} labels={r.labels} explorer={ex} />
        )}
      </Card>

      {r.transfers.length > 0 && (
        <Card title="Крупные переводы">
          <ul className="divide-y divide-line/40">
            {r.transfers.slice(0, 30).map((t) => (
              <li key={t.tx + t.from + t.to} className="py-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Badge tone={TYPE[t.type].tone}>{TYPE[t.type].label}</Badge>
                  <span className="text-lg font-semibold tabular-nums text-silver-1">{usd(t.usd, false)}</span>
                  <span className="text-base text-silver-2">
                    {num(t.tokens)} {r.token.symbol}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-2 text-sm text-silver-2">
                    {dateTime(t.ts * 1000)}
                    <a
                      href={`${ex}/tx/${t.tx}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Транзакция"
                      className="text-silver-2 transition hover:text-silver-1"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Addr value={t.from} className="text-sm text-silver-1" />
                  <ArrowRight className="size-4 shrink-0 text-silver-3" aria-hidden />
                  <Addr value={t.to} className="text-sm text-silver-1" />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
