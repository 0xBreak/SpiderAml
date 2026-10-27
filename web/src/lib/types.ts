// Shared API contract between /api/* route handlers and the dashboard UI.
// bigint never crosses the wire — token amounts are JS numbers (display precision) or decimal strings.

import type { NetworkId } from "./networks";

export type SectionName = "overview" | "liquidity" | "trading" | "holders" | "defi" | "activity" | "risk";
export const SECTION_NAMES: SectionName[] = ["overview", "liquidity", "trading", "holders", "defi", "activity", "risk"];

export type WindowKey = "1h" | "6h" | "24h" | "7d";
export const WINDOW_SECONDS: Record<WindowKey, number> = { "1h": 3600, "6h": 21600, "24h": 86400, "7d": 604800 };

export const WHALE_USD_DEFAULT = 10_000;

export type ContractKind =
  | "erc20"
  | "lp-v2"
  | "lp-v3"
  | "vault-4626"
  | "staking"
  | "erc721"
  | "erc1155"
  | "other";

export const KIND_LABEL: Record<ContractKind, string> = {
  erc20: "ERC-20",
  "lp-v2": "LP-Pair (V2)",
  "lp-v3": "LP-Pool (V3)",
  "vault-4626": "Vault (ERC-4626)",
  staking: "Staking",
  erc721: "ERC-721",
  erc1155: "ERC-1155",
  other: "DeFi Core / Other",
};

export interface Meta {
  tookMs: number;
  cached: boolean;
  generatedAt: string;
}

// ───────────────────────── overview ─────────────────────────
export interface MarketData {
  zerionId: string;
  iconUrl: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  circulatingSupply: number | null;
  /** Zerion `trading_volumes.volume_1d` */
  volume1dUsd: number | null;
  change1dPct: number | null;
  change30dPct: number | null;
  change90dPct: number | null;
  change365dPct: number | null;
  verifiedByZerion: boolean | null;
  description: string | null;
  links: { type: string; url: string; name: string }[];
}

export interface ProxyInfo {
  isProxy: boolean;
  standard: "EIP-1967" | "EIP-1967 beacon" | "EIP-1167" | null;
  implementation: string | null;
}

export interface ContractOverview {
  address: string;
  network: NetworkId;
  kind: ContractKind;
  kindLabel: string;
  /** true when the contract exposes ERC-20 metrics (decimals + totalSupply). */
  isToken: boolean;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: number | null;
  totalSupplyRaw: string | null;
  market: MarketData | null;
  verification: {
    /** null = unknown (no explorer key configured or explorer unreachable). */
    sourceVerified: boolean | null;
    contractName: string | null;
    compiler: string | null;
    source: "etherscan" | null;
  };
  proxy: ProxyInfo;
  owner: string | null;
  ownerIsContract: boolean | null;
  bytecodeSize: number;
  latestBlock: number;
  /** Pool/vault specifics when kind is lp-* or vault. */
  pool: { token0: TokenRef; token1: TokenRef; dex: string | null; feeBps: number | null } | null;
  vault: { asset: TokenRef; totalAssets: number | null } | null;
  /** non-fatal upstream problems (e.g. Zerion unavailable) — the section still renders with what we have */
  warnings: string[];
  meta: Meta;
}

export interface TokenRef {
  address: string;
  symbol: string | null;
  decimals: number | null;
}

// ───────────────────────── liquidity ─────────────────────────
export interface PoolInfo {
  address: string;
  dex: string;
  version: "v2" | "v3";
  feeBps: number | null;
  token0: TokenRef;
  token1: TokenRef;
  reserve0: number;
  reserve1: number;
  pairedWith: string | null;
  tvlUsd: number | null;
  /** true when TVL was estimated from one side only (token has no Zerion price). */
  tvlEstimated: boolean;
}

export interface LiquidityData {
  pools: PoolInfo[];
  totalTvlUsd: number | null;
  byDex: { dex: string; tvlUsd: number; pools: number }[];
  tvlToMarketCap: number | null;
  notes: string[];
  meta: Meta;
}

// ───────────────────────── trading ─────────────────────────
export interface FlowBucket {
  /** unix seconds (bucket start) */
  t: number;
  buyUsd: number | null;
  sellUsd: number | null;
  buyTokens: number;
  sellTokens: number;
  buys: number;
  sells: number;
}

export interface PricePoint {
  t: number;
  price: number;
}

export interface ScanCoverage {
  fromBlock: number;
  toBlock: number;
  fromTs: number;
  toTs: number;
  logs: number;
  /** why scanning stopped */
  stoppedBy: "window_complete" | "log_cap" | "time_budget" | "request_budget" | "rate_limited";
  requestedWindowSec: number;
  coveredSec: number;
  /** scanner diagnostics: eth_getLogs requests issued, final block-range per request, last range/limit error from the provider */
  diag?: { requests: number; chunk: number; lastRangeError: string | null; scanMs: number; rounds: number; slowestRoundMs: number };
}

export interface TradingData {
  /** Asset the pressure is measured on (the token itself, or token0 for a pool). */
  pressureAsset: { symbol: string | null; address: string };
  buckets: FlowBucket[];
  summary: {
    buyUsd: number | null;
    sellUsd: number | null;
    buyTokens: number;
    sellTokens: number;
    buyCount: number;
    sellCount: number;
    /** 0–100, share of buy volume in buy+sell volume. null when no classified trades. */
    buyPressurePct: number | null;
    uniqueBuyers: number;
    uniqueSellers: number;
    transferCount: number;
    /** Volume of all non-mint/burn transfers, USD. */
    transferVolumeUsd: number | null;
    /** Biggest single wallet-to-wallet movement in the window. */
    largestTransfer: { tokens: number; usd: number | null; from: string; to: string; tx: string } | null;
  };
  price: { day: PricePoint[]; week: PricePoint[]; change1dPct: number | null; change7dPct: number | null; rangeDay: { low: number; high: number } | null } | null;
  coverage: ScanCoverage;
  notes: string[];
  meta: Meta;
}

// ───────────────────────── holders ─────────────────────────
export type HolderKind = "eoa" | "multisig" | "contract" | "pool" | "burn" | "token";

export interface Holder {
  rank: number;
  /** number of on-chain interactions in the window (interactions mode only) */
  interactions?: number;
  address: string;
  label: string | null;
  kind: HolderKind;
  balance: number;
  pctSupply: number;
  valueUsd: number | null;
  receivedInWindow: number;
  sentInWindow: number;
}

export interface Concentration {
  top1Pct: number;
  top10Pct: number;
  top50Pct: number;
  /** Top-10 share excluding pools, burn addresses and the token contract itself. */
  top10AdjustedPct: number;
  /** Herfindahl-Hirschman index over the known holders' supply shares (0–10000). */
  hhi: number;
  /** Minimum number of known holders whose balances exceed 50% of supply; null if not reached in list. */
  nakamoto: number | null;
  /** slices for the donut: top1, 2–10, 11–50, rest */
  slices: { key: string; label: string; pct: number }[];
}

export interface HoldersData {
  /** "balances": ERC-20 holders ranked by balanceOf. "interactions": non-token contracts ranked by on-chain activity. */
  mode: "balances" | "interactions";
  holders: Holder[];
  concentration: Concentration;
  coverage: {
    candidates: number;
    scan: ScanCoverage;
    /** Holders discovered from transfer activity only — dormant whales outside the window are not visible. */
    caveat: string;
  };
  /** Zerion profiles for the first page, when requested with enrich=1. */
  profiles: Record<string, HolderProfile> | null;
  meta: Meta;
}

export interface HolderProfile {
  address: string;
  netWorthUsd: number | null;
  walletUsd: number | null;
  stakedUsd: number | null;
  depositedUsd: number | null;
  borrowedUsd: number | null;
  lockedUsd: number | null;
  positionsCount: number | null;
  pnl1dUsd: number | null;
  pnl1dPct: number | null;
  /** set when Zerion could not return the wallet (rate limit, still indexing …) */
  error: string | null;
}

// ───────────────────────── defi ─────────────────────────
export type PositionCategory = "wallet" | "staked" | "borrowed" | "liquidity" | "deposited" | "locked" | "rewards" | "other";
export const CATEGORY_LABEL: Record<PositionCategory, string> = {
  wallet: "Wallet",
  staked: "Staked",
  borrowed: "Borrowed",
  liquidity: "Liquidity Pools",
  deposited: "Lending / Deposit",
  locked: "Locked",
  rewards: "Rewards",
  other: "Other",
};

export interface ProtocolExposure {
  protocol: string;
  name: string;
  iconUrl: string | null;
  valueUsd: number;
  byCategory: Partial<Record<PositionCategory, number>>;
}

export interface ExposureBlock {
  totalUsd: number;
  byCategory: Partial<Record<PositionCategory, number>>;
  protocols: ProtocolExposure[];
}

export interface DefiData {
  /** What the analysed address itself holds/is deployed in (protocol contracts, vaults, treasuries). */
  contract: ExposureBlock | null;
  /** How the token is deployed across the top holders' wallets. */
  holders: (ExposureBlock & { sampled: number }) | null;
  notes: string[];
  meta: Meta;
}

// ───────────────────────── activity ─────────────────────────
export type ActivityType = "buy" | "sell" | "transfer" | "mint" | "burn" | "trade" | "deposit" | "withdraw" | "approve" | "other";

export interface ActivityItem {
  id: string;
  hash: string;
  ts: number;
  type: ActivityType;
  /** human-readable one-liner */
  summary: string;
  from: string | null;
  to: string | null;
  valueUsd: number | null;
  tokenAmount: number | null;
  protocol: string | null;
  isWhale: boolean;
  source: "zerion" | "onchain";
}

export interface ActivityData {
  items: ActivityItem[];
  whaleThresholdUsd: number;
  notes: string[];
  meta: Meta;
}

// ───────────────────────── whale report ─────────────────────────
export type WhaleTransferKind = "buy" | "sell" | "transfer" | "mint" | "burn";

export interface WhaleWallet {
  rank: number;
  address: string;
  kind: HolderKind;
  label: string | null;
  /** whale-sized transfers this wallet took part in */
  transfers: number;
  inCount: number;
  outCount: number;
  inTokens: number;
  outTokens: number;
  netTokens: number;
  volumeTokens: number;
  /** USD figures use the token's current price for the whole window; null when the token has no price */
  inUsd: number | null;
  outUsd: number | null;
  netUsd: number | null;
  volumeUsd: number | null;
  /** bought from / sold into DEX pools */
  dexBuyUsd: number | null;
  dexSellUsd: number | null;
  dexBuys: number;
  dexSells: number;
  largestTokens: number;
  largestUsd: number | null;
  largestTx: string;
  /** unix seconds, estimated from the block number */
  lastTs: number;
  /** current on-chain balance */
  balance: number | null;
  pctSupply: number | null;
}

export interface WhaleTransfer {
  tx: string;
  block: number;
  /** unix seconds, estimated from the block number (the block number itself is exact) */
  ts: number;
  type: WhaleTransferKind;
  from: string;
  to: string;
  tokens: number;
  usd: number | null;
}

export interface WhaleReport {
  token: { address: string; symbol: string | null; name: string | null; decimals: number; priceUsd: number | null };
  network: string;
  window: WindowKey;
  thresholdUsd: number;
  thresholdTokens: number;
  /** "usd": threshold is the USD amount; "supply": token has no price, 0.1% of total supply is used instead */
  thresholdBasis: "usd" | "supply";
  summary: {
    wallets: number;
    transfers: number;
    volumeTokens: number;
    volumeUsd: number | null;
    dexBuyUsd: number | null;
    dexSellUsd: number | null;
    largest: WhaleTransfer | null;
  };
  /** ranked by volume; capped (see `truncated`) */
  wallets: WhaleWallet[];
  /** preview: the largest transfers; the downloads carry every one that was found */
  transfers: WhaleTransfer[];
  truncated: { wallets: number; transfers: number };
  coverage: ScanCoverage;
  notes: string[];
  meta: Meta;
}

// ───────────────────────── risk ─────────────────────────
export interface RiskFactor {
  key: string;
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface RiskData {
  /** 0 (safe) – 100 (critical). */
  score: number;
  level: "low" | "moderate" | "high" | "critical";
  factors: RiskFactor[];
  /** factors that could not be evaluated (missing data) */
  skipped: string[];
  /** adjustments explained on the page: stablecoin, cex_liquidity, exchange_holders */
  context?: string[];
  meta: Meta;
}

// ───────────────────────── envelope ─────────────────────────
export interface SectionMap {
  overview: ContractOverview;
  liquidity: LiquidityData;
  trading: TradingData;
  holders: HoldersData;
  defi: DefiData;
  activity: ActivityData;
  risk: RiskData;
}

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; retryAfterSec?: number };
}

export type ApiErrorCode =
  | "INVALID_ADDRESS"
  | "INVALID_NETWORK"
  | "INVALID_PARAMS"
  | "NOT_A_CONTRACT"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "CONFIG_MISSING"
  | "UNSUPPORTED"
  | "INTERNAL";

export type AnalyzeAllResponse = { [K in SectionName]?: SectionMap[K] } & {
  errors: Partial<Record<SectionName, ApiErrorBody["error"]>>;
};
