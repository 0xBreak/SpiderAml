// Shapes returned by the data layer (spideraml-data). Keep in sync with its src/check.ts and src/sanctions.ts.
import type { NetworkMeta } from "./networks";
import type { RiskData } from "./types";

export type Category = "sanctioned" | "exploit" | "phishing" | "scam" | "mixer" | "other" | "info";
export type Severity = 0 | 1 | 2 | 3;
export type Level = "low" | "medium" | "high" | "critical";

export interface Finding {
  category: Category;
  severity: Severity;
  label: string;
  source: string;
  sourceName: string;
  url: string | null;
  chain: string | null;
}

export interface CheckReport {
  address: string;
  kind: "evm" | "tron";
  network: string;
  score: number;
  level: Level;
  possibleScam: boolean;
  findings: Finding[];
  tags: Finding[];
  sanctions: { list: string; name: string; program: string | null; asset: string; url: string; firstSeen: number; checkedAt: number }[];
  counterparties: { checked: number; flagged: { address: string; category: Category; severity: Severity; label: string }[] } | null;
  portfolio: { totalUsd: number | null; change1dPct: number | null } | null;
  contract: { isContract: boolean; name: string | null; symbol: string | null; kind: string | null; risk: Omit<RiskData, "meta"> | null } | null;
  onchain: { chainId: number; registry: string; category: string; level: number; explorer: string } | null;
  notes: string[];
  checkedAt: string;
}

export type LabelMap = Record<string, { category: Category; severity: Severity; label: string }>;

export interface SanctionItem {
  address: string;
  chain: string;
  asset: string;
  name: string;
  list: string;
  program: string | null;
  sourceUrl: string;
  listedAt: string | null;
  firstSeen: number;
  checkedAt: number;
}

export interface SourceInfo {
  id: string;
  name: string;
  url: string;
  kind: "labels" | "sanctions";
  count: number;
  fetchedAt: number | null;
  error: string | null;
}

export interface SanctionsPage {
  total: number;
  page: number;
  pageSize: number;
  items: SanctionItem[];
  chains: { chain: string; count: number }[];
  lists: { list: string; count: number }[];
  sources: (SourceInfo & { list: string })[];
  updatedAt: number | null;
}

export interface MetaInfo {
  networks: (NetworkMeta & { configured: boolean })[];
  sources: SourceInfo[];
  stats: { labeledAddresses: number; riskyAddresses: number; sanctionedAddresses: number; sanctionLists: number };
  ethUsd: number | null;
  registry: { chainId: number; name: string; address: string } | null;
}

export interface Market {
  exchange: string;
  type: "cex" | "dex";
  pair: string;
  priceUsd: number | null;
  spreadPct: number | null;
  depthUpUsd: number | null;
  depthDownUsd: number | null;
  volumeUsd: number;
  volumeSharePct: number;
  stale: boolean;
  anomaly: boolean;
  url: string | null;
}

export interface MarketsData {
  coingeckoId: string;
  url: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  cexVolumeUsd: number;
  dexVolumeUsd: number;
  markets: Market[];
  updatedAt: string;
}

export type ReportCategory = "sanctioned" | "exploit" | "phishing" | "scam" | "mixer" | "other" | "false_positive";
