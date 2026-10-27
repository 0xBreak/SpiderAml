import type { Metadata } from "next";
import { Suspense } from "react";
import { Coins, Droplets, KeyRound, Users } from "lucide-react";
import { SearchForm } from "@/components/SearchForm";
import { CardSkeleton, ErrorBox, PageTitle } from "@/components/ui";
import { DataError, getMarkets, getSection, limit } from "@/lib/data";
import { trackEvent } from "@/lib/metrics";
import type { MarketsData } from "@/lib/api-types";
import { isNetworkId } from "@/lib/networks";
import { HoldersSection, LiquiditySection, MarketsSection, OverviewSection, RiskSection, TradingSection } from "./sections";

export const metadata: Metadata = { title: "Анализ токена" };
export const dynamic = "force-dynamic";

type SP = Promise<{ address?: string; network?: string }>;

const EXAMPLES = [
  { address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", network: "ethereum", label: "PEPE (Ethereum)" },
  { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", network: "arbitrum", label: "ARB (Arbitrum)" },
  { address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", network: "bsc", label: "CAKE (BNB Chain)" },
];

export default async function TokenPage({ searchParams }: { searchParams: SP }) {
  const { address, network: raw } = await searchParams;
  const network = raw && isNetworkId(raw) ? raw : "ethereum";

  // Validate once up front: a wrong address or "not a contract" should be one clear message, not five broken cards.
  let error: DataError | null = null;
  let overview: Awaited<ReturnType<typeof getSection<"overview">>> | null = null;
  let markets: MarketsData | null = null;
  if (address) {
    try {
      await limit("token", 12);
      [overview, markets] = await Promise.all([
        getSection("overview", address.trim(), network),
        getMarkets(address.trim(), network)
          .then((r) => r.markets)
          .catch(() => null),
      ]);
      trackEvent("token", network, "/token");
    } catch (e) {
      error = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
      trackEvent("token", `error:${error.code}`, "/token");
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Анализ токена" sub="Цена, пулы, держатели и права владельца." />
      <SearchForm action="/token" address={address} network={network} placeholder="Адрес токена: 0x…" button="Разобрать" />
      {!address && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {EXAMPLES.map((e) => (
              <a key={e.address} href={`/token?address=${e.address}&network=${e.network}`} className="border border-line px-2 py-0.5 text-silver-2 hover:text-silver-1">
                {e.label}
              </a>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Coins, title: "Цена и объёмы" },
              { icon: Droplets, title: "Пулы" },
              { icon: Users, title: "Держатели" },
              { icon: KeyRound, title: "Права владельца" },
            ].map(({ icon: Icon, title }) => (
              <div key={title} className="card flex items-center gap-3 p-4">
                <Icon className="size-4 text-accent" aria-hidden />
                <span className="text-sm text-silver-2">{title}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {error && <ErrorBox code={error.code} message={error.message} />}
      {overview && address && (
        <div className="space-y-4">
          <OverviewSection o={overview} markets={markets} />
          {overview.isToken && <MarketsSection m={markets} />}
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Suspense fallback={<CardSkeleton title="Риски" lines={6} />}>
              <RiskSection address={overview.address} network={network} />
            </Suspense>
            <Suspense fallback={<CardSkeleton title="Деньги в пулах" lines={6} />}>
              <LiquiditySection address={overview.address} network={network} />
            </Suspense>
          </div>
          {overview.isToken && (
            <>
              <Suspense fallback={<CardSkeleton title="Покупки и продажи за сутки" lines={8} />}>
                <TradingSection address={overview.address} network={network} />
              </Suspense>
              <Suspense fallback={<CardSkeleton title="Крупные держатели" lines={10} />}>
                <HoldersSection address={overview.address} network={network} />
              </Suspense>
            </>
          )}
        </div>
      )}
    </div>
  );
}
