import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Coins, Droplets, KeyRound, Users } from "lucide-react";
import { SearchForm } from "@/components/SearchForm";
import { CardSkeleton, ErrorBox, Notice, PageTitle } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { GaEvent } from "@/components/Analytics";
import { DataError, getMarkets, getSection, limit } from "@/lib/data";
import { trackEvent } from "@/lib/metrics";
import type { MarketsData } from "@/lib/api-types";
import { NETWORKS, isNetworkId } from "@/lib/networks";
import { HoldersSection, LiquiditySection, MarketsSection, OverviewSection, RiskSection, TradingSection } from "./sections";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Token" });
  return { title: t("title"), ...seo(locale, "/token", await searchParams) };
}
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
  const t = await getTranslations("Token");
  const tCheck = await getTranslations("Check");

  // Validate once up front: a wrong address or "not a contract" should be one clear message, not five broken cards.
  let error: DataError | null = null;
  let overview: Awaited<ReturnType<typeof getSection<"overview">>> | null = null;
  let markets: MarketsData | null = null;
  let listed: { network: string; symbol: string }[] = [];
  let marketsFailed = false;
  if (address) {
    try {
      await limit("token", 12);
      [overview, markets] = await Promise.all([
        getSection("overview", address.trim(), network),
        getMarkets(address.trim(), network)
          .then((r) => ((listed = r.listed ?? []), r.markets))
          .catch(() => ((marketsFailed = true), null)),
      ]);
      trackEvent("token", overview?.symbol ?? network, "/token", { target: address.trim(), network });
    } catch (e) {
      error = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
      trackEvent("token", `error:${error.code}`, "/token", { target: address.trim(), network });
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle title={t("title")} sub={t("sub")} />
      <SearchForm action="/token" address={address} network={network} placeholder={t("placeholder")} button={t("button")} />
      {!address && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {EXAMPLES.map((e) => (
              <Link key={e.address} href={`/token?address=${e.address}&network=${e.network}`} className="border border-line px-2 py-0.5 text-silver-2 hover:text-silver-1">
                {e.label}
              </Link>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Coins, key: "featPrice" },
              { icon: Droplets, key: "featPools" },
              { icon: Users, key: "featHolders" },
              { icon: KeyRound, key: "featOwner" },
            ].map(({ icon: Icon, key }) => (
              <div key={key} className="card flex items-center gap-3 p-4">
                <Icon className="size-4 text-accent" aria-hidden />
                <span className="text-sm text-silver-2">{t(key)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {error && <ErrorBox code={error.code} message={error.message} />}
      {overview && address && (
        <div className="space-y-4">
          <GaEvent name="token_analysis" params={{ network, is_token: overview.isToken, stablecoin: !!markets?.stablecoin }} />
          {(() => {
            // the same address can hold an unrelated contract on another network: say which network the real token is on
            const other = listed.filter((x) => x.network !== network && isNetworkId(x.network));
            if (listed.some((x) => x.network === network) || other.length === 0) return null;
            const label = (n: string) => NETWORKS[n as keyof typeof NETWORKS].label;
            return (
              <Notice tone="warn">
                {tCheck("elsewhere", { symbol: other[0].symbol, networks: other.map((x) => label(x.network)).join(", "), here: NETWORKS[network].label })}{" "}
                {other.map((x) => (
                  <Link key={x.network} href={`/token?address=${overview!.address}&network=${x.network}`} className="link mr-3 whitespace-nowrap">
                    {tCheck("checkOn", { network: label(x.network) })}
                  </Link>
                ))}
              </Notice>
            );
          })()}
          <OverviewSection o={overview} markets={markets} />
          {overview.isToken && <MarketsSection m={markets} failed={marketsFailed} />}
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Suspense fallback={<CardSkeleton title={t("skRisks")} lines={6} />}>
              <RiskSection address={overview.address} network={network} />
            </Suspense>
            <Suspense fallback={<CardSkeleton title={t("skPools")} lines={6} />}>
              <LiquiditySection address={overview.address} network={network} />
            </Suspense>
          </div>
          {overview.isToken && (
            <>
              <Suspense fallback={<CardSkeleton title={t("skTrading")} lines={8} />}>
                <TradingSection address={overview.address} network={network} />
              </Suspense>
              <Suspense fallback={<CardSkeleton title={t("skHolders")} lines={10} />}>
                <HoldersSection address={overview.address} network={network} />
              </Suspense>
            </>
          )}
        </div>
      )}
    </div>
  );
}
