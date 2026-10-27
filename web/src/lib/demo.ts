// Demo data generator. Used only when the real data layer is absent:
//   - in development, when DATA_URL is not set (so pages are always previewable), or
//   - explicitly with DATA_DEMO=1.
// Never enabled in production without the flag. Deterministic: same shapes every load.
import type { Category, CheckReport, LabelMap, MarketsData, MetaInfo, SanctionsPage, SourceInfo } from "./api-types";
import type {
  ActivityData,
  ContractOverview,
  DefiData,
  HoldersData,
  LiquidityData,
  RiskData,
  SectionMap,
  SectionName,
  TradingData,
  WhaleReport,
} from "./types";
import { NETWORKS, NETWORK_IDS, type NetworkId } from "./networks";

export const demoEnabled = () => process.env.DATA_DEMO === "1" || process.env.DATA_DEMO === "true" || (!process.env.DATA_URL && process.env.NODE_ENV !== "production");

const now = () => Date.now();
const iso = () => new Date().toISOString();
const meta = () => ({ tookMs: 18, cached: false, generatedAt: iso() });

const A = {
  wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  risky: "0x098B716B8Aaf21512996dC57EB0615e2383E2f96",
  token: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
  pair: "0x1111111111111111111111111111111111111111",
  holder1: "0x2222222222222222222222222222222222222222",
  holder2: "0x3333333333333333333333333333333333333333",
  holder3: "0x4444444444444444444444444444444444444444",
};

const finding = (category: Category, severity: 0 | 1 | 2 | 3, label: string, sourceName = "Demo Labels"): CheckReport["findings"][number] => ({
  category,
  severity,
  label,
  source: "demo",
  sourceName,
  url: "https://example.com/source",
  chain: "ethereum",
});

// ---------------------------------------------------------------- check

export function demoCheck(address: string, network: string): CheckReport {
  const risky = address.toLowerCase() !== A.wallet.toLowerCase();
  return {
    address,
    kind: "evm",
    network,
    score: risky ? 78 : 12,
    level: risky ? "high" : "low",
    possibleScam: risky,
    findings: risky
      ? [finding("sanctioned", 3, "OFAC SDN"), finding("exploit", 2, "Bybit hack"), finding("mixer", 1, "Mixer exposure")]
      : [],
    tags: risky ? [finding("info", 0, "Demo Exchange")] : [finding("info", 0, "Vitalik.eth")],
    sanctions: risky
      ? [{ list: "OFAC SDN", name: "Demo Entity", program: "CYBER2", asset: "ETH", url: "https://example.com/ofac", firstSeen: now() - 86_400_000 * 120, checkedAt: now() }]
      : [],
    counterparties: {
      checked: 42,
      flagged: risky ? [{ address: A.risky, category: "phishing", severity: 3, label: "Phishing" }] : [],
    },
    portfolio: { totalUsd: risky ? 12_480.5 : 245_000, change1dPct: 2.35 },
    contract: risky ? null : { isContract: false, name: null, symbol: null, kind: null, risk: null },
    onchain: risky
      ? { chainId: 42161, registry: "0x000000000000000000000000000000000000dEaD", category: "exploit", level: 2, explorer: "https://arbiscan.io/address/0x000000000000000000000000000000000000dEaD" }
      : null,
    notes: [],
    checkedAt: iso(),
  };
}

// ---------------------------------------------------------------- sections

const risk = (score: number, level: RiskData["level"]): RiskData => ({
  score,
  level,
  factors: [
    { key: "concentration", label: "Concentration", points: 4, max: 10, detail: "Top-10 hold 38% of supply." },
    { key: "liquidity", label: "Liquidity", points: 3, max: 10, detail: "Pools hold $1.2M." },
    { key: "verified", label: "Verified", points: 0, max: 10, detail: "Source code is published." },
    { key: "admin", label: "Owner rights", points: 2, max: 10, detail: "Owner can pause transfers." },
    { key: "listing", label: "Listing", points: 7, max: 10, detail: "Trades on two venues." },
  ],
  skipped: [],
  meta: meta(),
});

const overview = (address: string, network: NetworkId): ContractOverview => ({
  address,
  network,
  kind: "erc20",
  kindLabel: "ERC-20",
  isToken: true,
  name: "Demo Token",
  symbol: "DEMO",
  decimals: 18,
  totalSupply: 1_000_000_000,
  totalSupplyRaw: "1000000000000000000000000000",
  market: {
    zerionId: "demo-token",
    iconUrl: null,
    priceUsd: 0.00342,
    marketCapUsd: 3_420_000,
    fdvUsd: 3_420_000,
    circulatingSupply: 1_000_000_000,
    volume1dUsd: 412_000,
    change1dPct: 4.12,
    change30dPct: -8.4,
    change90dPct: 21.5,
    change365dPct: null,
    verifiedByZerion: true,
    description: "Demo token for UI previews.",
    links: [{ type: "website", url: "https://example.com", name: "Website" }],
  },
  verification: { sourceVerified: true, contractName: "DemoToken", compiler: "v0.8.24", source: "etherscan" },
  proxy: { isProxy: false, standard: null, implementation: null },
  owner: A.holder1,
  ownerIsContract: false,
  bytecodeSize: 8421,
  latestBlock: 123_456_789,
  pool: null,
  vault: null,
  warnings: [],
  meta: meta(),
});

const liquidity: LiquidityData = {
  pools: [
    { address: A.pair, dex: "Uniswap V3", version: "v3", feeBps: 30, token0: { address: A.token, symbol: "DEMO", decimals: 18 }, token1: { address: A.wallet, symbol: "WETH", decimals: 18 }, reserve0: 120_000_000, reserve1: 410, pairedWith: "WETH", tvlUsd: 1_240_000, tvlEstimated: false },
    { address: "0x5555555555555555555555555555555555555555", dex: "PancakeSwap", version: "v2", feeBps: 25, token0: { address: A.token, symbol: "DEMO", decimals: 18 }, token1: { address: A.wallet, symbol: "USDT", decimals: 6 }, reserve0: 60_000_000, reserve1: 205_000, pairedWith: "USDT", tvlUsd: 410_000, tvlEstimated: false },
    { address: "0x6666666666666666666666666666666666666666", dex: "SushiSwap", version: "v2", feeBps: 30, token0: { address: A.token, symbol: "DEMO", decimals: 18 }, token1: { address: A.wallet, symbol: "WETH", decimals: 18 }, reserve0: 20_000_000, reserve1: 68, pairedWith: "WETH", tvlUsd: 210_000, tvlEstimated: true },
  ],
  totalTvlUsd: 1_860_000,
  byDex: [
    { dex: "Uniswap V3", tvlUsd: 1_240_000, pools: 1 },
    { dex: "PancakeSwap", tvlUsd: 410_000, pools: 1 },
    { dex: "SushiSwap", tvlUsd: 210_000, pools: 1 },
  ],
  tvlToMarketCap: 0.54,
  notes: [],
  meta: meta(),
};

const trading: TradingData = {
  pressureAsset: { symbol: "DEMO", address: A.token },
  buckets: Array.from({ length: 24 }, (_, i) => ({
    t: Math.floor(now() / 1000) - (23 - i) * 3600,
    buyUsd: 8_000 + i * 700,
    sellUsd: 6_000 + (23 - i) * 500,
    buyTokens: 2_300_000 + i * 90_000,
    sellTokens: 1_800_000 + (23 - i) * 70_000,
    buys: 12 + (i % 7),
    sells: 9 + (i % 5),
  })),
  summary: {
    buyUsd: 212_000,
    sellUsd: 168_000,
    buyTokens: 61_000_000,
    sellTokens: 44_000_000,
    buyCount: 142,
    sellCount: 118,
    buyPressurePct: 55.8,
    uniqueBuyers: 96,
    uniqueSellers: 81,
    transferCount: 1_284,
    transferVolumeUsd: 3_410_000,
    largestTransfer: { tokens: 12_000_000, usd: 41_040, from: A.holder1, to: A.holder2, tx: "0xabc123" },
  },
  price: {
    day: Array.from({ length: 24 }, (_, i) => ({ t: Math.floor(now() / 1000) - (23 - i) * 3600, price: 0.0031 + i * 0.00001 })),
    week: Array.from({ length: 7 }, (_, i) => ({ t: Math.floor(now() / 1000) - (6 - i) * 86_400, price: 0.0028 + i * 0.0001 })),
    change1dPct: 4.12,
    change7dPct: 12.4,
    rangeDay: { low: 0.00305, high: 0.00355 },
  },
  coverage: { fromBlock: 120_000_000, toBlock: 123_456_789, fromTs: Math.floor(now() / 1000) - 86_400, toTs: Math.floor(now() / 1000), logs: 12_840, stoppedBy: "window_complete", requestedWindowSec: 86_400, coveredSec: 86_400 },
  notes: [],
  meta: meta(),
};

const holders: HoldersData = {
  mode: "balances",
  holders: [
    { rank: 1, address: A.pair, label: "Uniswap V3 Pool", kind: "pool", balance: 120_000_000, pctSupply: 12, valueUsd: 410_400, receivedInWindow: 0, sentInWindow: 0 },
    { rank: 2, address: A.holder1, label: "Demo Treasury", kind: "multisig", balance: 96_000_000, pctSupply: 9.6, valueUsd: 328_320, receivedInWindow: 2_000_000, sentInWindow: 500_000 },
    { rank: 3, address: A.holder2, label: null, kind: "eoa", balance: 64_000_000, pctSupply: 6.4, valueUsd: 218_880, receivedInWindow: 1_200_000, sentInWindow: 800_000 },
    { rank: 4, address: A.holder3, label: null, kind: "eoa", balance: 41_000_000, pctSupply: 4.1, valueUsd: 140_220, receivedInWindow: 300_000, sentInWindow: 900_000 },
    { rank: 5, address: A.risky, label: "Flagged address", kind: "eoa", balance: 12_000_000, pctSupply: 1.2, valueUsd: 41_040, receivedInWindow: 0, sentInWindow: 1_500_000 },
    { rank: 6, address: A.wallet, label: "Vitalik.eth", kind: "eoa", balance: 8_000_000, pctSupply: 0.8, valueUsd: 27_360, receivedInWindow: 0, sentInWindow: 0 },
  ],
  concentration: {
    top1Pct: 12,
    top10Pct: 38.5,
    top50Pct: 61.2,
    top10AdjustedPct: 26.5,
    hhi: 540,
    nakamoto: 4,
    slices: [
      { key: "top1", label: "Top 1", pct: 12 },
      { key: "top10", label: "2–10", pct: 26.5 },
      { key: "top50", label: "11–50", pct: 22.7 },
      { key: "rest", label: "Rest", pct: 38.8 },
    ],
  },
  coverage: { candidates: 120, scan: trading.coverage, caveat: "Demo data." },
  profiles: null,
  meta: meta(),
};

const defi: DefiData = { contract: null, holders: null, notes: [], meta: meta() };

const activity: ActivityData = {
  items: [
    { id: "1", hash: "0xabc123", ts: Math.floor(now() / 1000) - 600, type: "buy", summary: "Bought 120,000 DEMO for 410 USDC", from: A.wallet, to: A.pair, valueUsd: 410, tokenAmount: 120_000, protocol: "Uniswap V3", isWhale: false, source: "onchain" },
    { id: "2", hash: "0xdef456", ts: Math.floor(now() / 1000) - 3_600, type: "transfer", summary: "Transferred 2,000,000 DEMO", from: A.holder1, to: A.holder2, valueUsd: 6_840, tokenAmount: 2_000_000, protocol: null, isWhale: true, source: "onchain" },
    { id: "3", hash: "0xghi789", ts: Math.floor(now() / 1000) - 7_200, type: "sell", summary: "Sold 800,000 DEMO for 2,736 USDC", from: A.holder3, to: A.pair, valueUsd: 2_736, tokenAmount: 800_000, protocol: "Uniswap V3", isWhale: false, source: "onchain" },
  ],
  whaleThresholdUsd: 10_000,
  notes: [],
  meta: meta(),
};

export function demoSection(name: SectionName, address: string, network: string): SectionMap[SectionName] & { labels?: LabelMap } {
  const net = (NETWORK_IDS.includes(network as NetworkId) ? network : "ethereum") as NetworkId;
  const labels: LabelMap = {
    [A.holder1.toLowerCase()]: { category: "info", severity: 0, label: "Demo Treasury" },
    [A.risky.toLowerCase()]: { category: "phishing", severity: 3, label: "Phishing" },
  };
  const map = {
    overview: overview(address, net),
    liquidity,
    trading,
    holders,
    defi,
    activity,
    risk: risk(62, "high"),
  } satisfies SectionMap;
  const value = name === "holders" ? { ...holders, labels } : map[name];
  return value as SectionMap[SectionName] & { labels?: LabelMap };
}

// ---------------------------------------------------------------- markets

const markets: MarketsData = {
  coingeckoId: "demo-token",
  url: "https://www.coingecko.com/en/coins/demo-token",
  priceUsd: 0.00342,
  marketCapUsd: 3_420_000,
  volume24hUsd: 412_000,
  cexVolumeUsd: 280_000,
  dexVolumeUsd: 132_000,
  updatedAt: iso(),
  markets: [
    { exchange: "Binance", type: "cex", pair: "DEMO/USDT", priceUsd: 0.00343, spreadPct: 0.12, depthUpUsd: 84_000, depthDownUsd: 76_000, volumeUsd: 190_000, volumeSharePct: 46.1, stale: false, anomaly: false, url: "https://www.binance.com" },
    { exchange: "Coinbase Exchange", type: "cex", pair: "DEMO/USD", priceUsd: 0.00341, spreadPct: 0.18, depthUpUsd: 42_000, depthDownUsd: 39_000, volumeUsd: 90_000, volumeSharePct: 21.8, stale: false, anomaly: false, url: "https://www.coinbase.com" },
    { exchange: "Uniswap V3 (Ethereum)", type: "dex", pair: "DEMO/WETH", priceUsd: 0.00342, spreadPct: 0.3, depthUpUsd: 120_000, depthDownUsd: 118_000, volumeUsd: 96_000, volumeSharePct: 23.3, stale: false, anomaly: false, url: null },
    { exchange: "PancakeSwap V2 (BSC)", type: "dex", pair: "DEMO/USDT", priceUsd: 0.00339, spreadPct: 0.45, depthUpUsd: 38_000, depthDownUsd: 35_000, volumeUsd: 36_000, volumeSharePct: 8.8, stale: true, anomaly: false, url: null },
  ],
};

// ---------------------------------------------------------------- meta

const sources: SourceInfo[] = [
  { id: "ofac-sdn", name: "OFAC SDN", url: "https://sanctionssearch.ofac.treas.gov", kind: "sanctions", count: 1_024, fetchedAt: now() - 3_600_000, error: null },
  { id: "uk-fcdo", name: "UK Sanctions List", url: "https://www.gov.uk/government/publications/the-uk-sanctions-list", kind: "sanctions", count: 412, fetchedAt: now() - 3_600_000, error: null },
  { id: "eu-fsf", name: "EU Consolidated List", url: "https://www.sanctionsmap.eu", kind: "sanctions", count: 434, fetchedAt: now() - 3_600_000, error: null },
  { id: "scamsniffer", name: "ScamSniffer", url: "https://scamsniffer.io", kind: "labels", count: 214_000, fetchedAt: now() - 3_600_000, error: null },
  { id: "etherscan-labels", name: "Etherscan labels", url: "https://etherscan.io", kind: "labels", count: 986_000, fetchedAt: now() - 3_600_000, error: null },
  { id: "forta", name: "Forta", url: "https://forta.org", kind: "labels", count: 40_000, fetchedAt: now() - 3_600_000, error: null },
];

export function demoMeta(): MetaInfo {
  return {
    networks: NETWORK_IDS.map((id) => ({ ...NETWORKS[id], configured: true })),
    sources,
    stats: { labeledAddresses: 1_240_000, riskyAddresses: 38_400, sanctionedAddresses: 1_870, sanctionLists: 3 },
    ethUsd: 3_200,
    registry: { chainId: 42161, name: "SpiderAML Registry", address: "0x000000000000000000000000000000000000dEaD" },
  };
}

// ---------------------------------------------------------------- sanctions

export function demoSanctions(p: { q?: string; chain?: string; list?: string; page?: number; pageSize?: number }): SanctionsPage {
  const pageSize = p.pageSize ?? 10;
  const page = Math.max(1, p.page ?? 1);
  const filtered = Boolean(p.q || p.chain || p.list);
  const total = filtered ? 640 : 1_870;
  const start = (page - 1) * pageSize;
  const count = Math.max(0, Math.min(pageSize, total - start));
  const listNames = ["OFAC SDN", "UK", "EU"];
  const chains = ["evm", "evm", "tron", "bitcoin"];
  const assets: Record<string, string> = { evm: "ETH", tron: "TRX", bitcoin: "BTC" };

  const items = Array.from({ length: count }, (_, k) => {
    const i = start + k;
    const chain = chains[i % chains.length];
    const address = chain === "tron" ? `T${String(i + 1).padStart(33, "1")}` : `0x${(i + 1).toString(16).padStart(40, "0")}`;
    return {
      address,
      chain,
      asset: assets[chain],
      name: `Demo Entity ${i + 1}`,
      list: listNames[i % listNames.length],
      program: i % 3 === 0 ? "CYBER2" : null,
      sourceUrl: `https://example.com/sanctions/${i + 1}`,
      listedAt: i % 4 === 0 ? null : new Date(2024 + (i % 3), i % 12, (i % 27) + 1).toISOString().slice(0, 10),
      firstSeen: now() - 86_400_000 * (30 + (i % 300)),
      checkedAt: now(),
    };
  });

  return {
    total,
    page,
    pageSize,
    items,
    chains: [
      { chain: "evm", count: 1_520 },
      { chain: "tron", count: 290 },
      { chain: "bitcoin", count: 60 },
    ],
    lists: [
      { list: "OFAC SDN", count: 1_024 },
      { list: "UK", count: 412 },
      { list: "EU", count: 434 },
    ],
    sources: sources
      .filter((s) => s.kind === "sanctions")
      .map((s) => ({ ...s, list: s.name })),
    updatedAt: now() - 3_600_000,
  };
}

// ---------------------------------------------------------------- whales

export function demoWhales(network: string, whaleUsd: number, window: string): WhaleReport & { labels: LabelMap } {
  const labels: LabelMap = {
    [A.risky.toLowerCase()]: { category: "phishing", severity: 3, label: "Phishing" },
    [A.holder1.toLowerCase()]: { category: "info", severity: 0, label: "Demo Treasury" },
  };
  const w = (rank: number, address: string, kind: WhaleReport["wallets"][number]["kind"], inUsd: number, outUsd: number, label: string | null): WhaleReport["wallets"][number] => ({
    rank,
    address,
    kind,
    label,
    transfers: 4 + rank,
    inCount: 2 + rank,
    outCount: 2,
    inTokens: (inUsd / 0.00342) | 0,
    outTokens: (outUsd / 0.00342) | 0,
    netTokens: ((inUsd - outUsd) / 0.00342) | 0,
    volumeTokens: ((inUsd + outUsd) / 0.00342) | 0,
    inUsd,
    outUsd,
    netUsd: inUsd - outUsd,
    volumeUsd: inUsd + outUsd,
    dexBuyUsd: inUsd * 0.6,
    dexSellUsd: outUsd * 0.5,
    dexBuys: 3,
    dexSells: 2,
    largestTokens: 4_000_000,
    largestUsd: 13_680,
    largestTx: "0xabc123",
    lastTs: Math.floor(now() / 1000) - 900,
    balance: 64_000_000,
    pctSupply: 6.4,
  });
  return {
    token: { address: A.token, symbol: "DEMO", name: "Demo Token", decimals: 18, priceUsd: 0.00342 },
    network,
    window: window as WhaleReport["window"],
    thresholdUsd: whaleUsd,
    thresholdTokens: whaleUsd / 0.00342,
    thresholdBasis: "usd",
    summary: {
      wallets: 6,
      transfers: 18,
      volumeTokens: 48_000_000,
      volumeUsd: 164_160,
      dexBuyUsd: 98_000,
      dexSellUsd: 66_000,
      largest: { tx: "0xabc123", block: 123_456_100, ts: Math.floor(now() / 1000) - 1_800, type: "buy", from: A.pair, to: A.holder1, tokens: 8_000_000, usd: 27_360 },
    },
    wallets: [
      w(1, A.holder1, "multisig", 46_000, 12_000, "Demo Treasury"),
      w(2, A.holder2, "eoa", 34_000, 8_000, null),
      w(3, A.holder3, "eoa", 21_000, 19_000, null),
      w(4, A.risky, "eoa", 2_000, 28_000, "Phishing"),
      w(5, A.wallet, "eoa", 12_000, 0, "Vitalik.eth"),
      w(6, A.pair, "pool", 30_000, 30_000, "Uniswap V3 Pool"),
    ],
    transfers: [
      { tx: "0xabc123", block: 123_456_100, ts: Math.floor(now() / 1000) - 1_800, type: "buy", from: A.pair, to: A.holder1, tokens: 8_000_000, usd: 27_360 },
      { tx: "0xdef456", block: 123_456_050, ts: Math.floor(now() / 1000) - 3_600, type: "sell", from: A.risky, to: A.pair, tokens: 6_000_000, usd: 20_520 },
      { tx: "0xghi789", block: 123_455_900, ts: Math.floor(now() / 1000) - 5_400, type: "transfer", from: A.holder2, to: A.holder3, tokens: 4_500_000, usd: 15_390 },
    ],
    truncated: { wallets: 0, transfers: 0 },
    coverage: trading.coverage,
    notes: [],
    meta: meta(),
    labels,
  };
}

// ---------------------------------------------------------------- reports

export function demoReportStatus(id: string) {
  return {
    id: Number(id) || 42,
    address: A.risky,
    network: "ethereum",
    category: "phishing",
    status: "reviewing" as const,
    reply: "Спасибо, проверяем доказательства. Ответ появится здесь.",
    createdAt: now() - 86_400_000,
    updatedAt: now() - 3_600_000,
  };
}

// ---------------------------------------------------------------- dispatcher

export function demoCall(path: string, params: Record<string, string | number | undefined>, body?: unknown): unknown {
  const address = String(params.address ?? A.wallet);
  const network = String(params.network ?? "ethereum");
  switch (path) {
    case "/v1/check":
      return demoCheck(address, network);
    case "/v1/aml":
      return demoSection((params.section as SectionName) ?? "overview", address, network);
    case "/v1/markets":
      return { markets };
    case "/v1/meta":
      return demoMeta();
    case "/v1/sanctions":
      return demoSanctions({ q: params.q as string | undefined, chain: params.chain as string | undefined, list: params.list as string | undefined, page: Number(params.page) || 1, pageSize: Number(params.pageSize) || 10 });
    case "/v1/whales":
      return demoWhales(network, Number(params.whaleUsd) || 50_000, String(params.window ?? "24h"));
    case "/v1/reports":
      return { ok: true, id: 42, token: "demo-token", echo: body };
    case "/v1/reports/status":
      return demoReportStatus(String(params.id ?? "42"));
    default:
      return {};
  }
}
