import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchForm } from "@/components/SearchForm";
import { CardSkeleton, ErrorBox, PageTitle } from "@/components/ui";
import { DataError, getSection, limit } from "@/lib/data";
import { isNetworkId } from "@/lib/networks";
import { HoldersSection, LiquiditySection, OverviewSection, RiskSection, TradingSection } from "./sections";

export const metadata: Metadata = { title: "AML-анализ токена" };
export const dynamic = "force-dynamic";

type SP = Promise<{ address?: string; network?: string }>;

const EXAMPLES = [
  { address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", network: "ethereum", label: "PEPE (Ethereum)" },
  { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", network: "arbitrum", label: "ARB (Arbitrum)" },
  { address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", network: "bsc", label: "CAKE (BNB Chain)" },
];

export default async function AmlPage({ searchParams }: { searchParams: SP }) {
  const { address, network: raw } = await searchParams;
  const network = raw && isNetworkId(raw) ? raw : "ethereum";

  // Validate once up front: a wrong address or "not a contract" should be one clear message, not five broken cards.
  let error: DataError | null = null;
  let overview: Awaited<ReturnType<typeof getSection<"overview">>> | null = null;
  if (address) {
    try {
      await limit("aml", 12);
      overview = await getSection("overview", address.trim(), network);
    } catch (e) {
      error = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle title="AML-анализ токена" sub="Вставьте адрес токена или контракта: покажем цену, ликвидность, крупных держателей, движение денег и риски." />
      <SearchForm action="/aml" address={address} network={network} placeholder="Адрес токена или контракта 0x…" button="Анализировать" />
      {!address && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-silver-3">
          <span>Примеры:</span>
          {EXAMPLES.map((e) => (
            <a key={e.address} href={`/aml?address=${e.address}&network=${e.network}`} className="rounded border border-line px-2 py-0.5 text-silver-2 hover:text-silver-1">
              {e.label}
            </a>
          ))}
        </div>
      )}
      {error && <ErrorBox code={error.code} message={error.message} />}
      {overview && address && (
        <div className="space-y-4">
          <OverviewSection o={overview} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Suspense fallback={<CardSkeleton title="Риски" lines={6} />}>
              <RiskSection address={overview.address} network={network} />
            </Suspense>
            <Suspense fallback={<CardSkeleton title="Ликвидность" lines={6} />}>
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
