// Client-safe network metadata. Server-only config (viem chains, DEX factories) lives in server/chains.ts.

export const NETWORK_IDS = ["ethereum", "arbitrum", "base", "polygon", "optimism", "bsc", "avalanche"] as const;
export type NetworkId = (typeof NETWORK_IDS)[number];

export interface NetworkMeta {
  id: NetworkId;
  label: string;
  chainId: number;
  /** Zerion's chain slug (used in filter[chain_ids] / filter[implementation_chain_id]). */
  zerionChainId: string;
  nativeSymbol: string;
  explorer: string;
  /** Average block time in seconds — used to convert time windows to block ranges. */
  blockTimeSec: number;
  /** Tailwind-independent accent for the network chip. */
  color: string;
}

export const NETWORKS: Record<NetworkId, NetworkMeta> = {
  ethereum: { id: "ethereum", label: "Ethereum", chainId: 1, zerionChainId: "ethereum", nativeSymbol: "ETH", explorer: "https://etherscan.io", blockTimeSec: 12, color: "#8c9eff" },
  arbitrum: { id: "arbitrum", label: "Arbitrum", chainId: 42161, zerionChainId: "arbitrum", nativeSymbol: "ETH", explorer: "https://arbiscan.io", blockTimeSec: 0.25, color: "#28a0f0" },
  base: { id: "base", label: "Base", chainId: 8453, zerionChainId: "base", nativeSymbol: "ETH", explorer: "https://basescan.org", blockTimeSec: 2, color: "#0052ff" },
  polygon: { id: "polygon", label: "Polygon", chainId: 137, zerionChainId: "polygon", nativeSymbol: "POL", explorer: "https://polygonscan.com", blockTimeSec: 2.1, color: "#a56cff" },
  optimism: { id: "optimism", label: "Optimism", chainId: 10, zerionChainId: "optimism", nativeSymbol: "ETH", explorer: "https://optimistic.etherscan.io", blockTimeSec: 2, color: "#ff0420" },
  bsc: { id: "bsc", label: "BNB Chain", chainId: 56, zerionChainId: "binance-smart-chain", nativeSymbol: "BNB", explorer: "https://bscscan.com", blockTimeSec: 0.45, color: "#f0b90b" },
  avalanche: { id: "avalanche", label: "Avalanche", chainId: 43114, zerionChainId: "avalanche", nativeSymbol: "AVAX", explorer: "https://snowtrace.io", blockTimeSec: 2, color: "#e84142" },
};

export const isNetworkId = (v: string): v is NetworkId => (NETWORK_IDS as readonly string[]).includes(v);

export const explorerAddress = (n: NetworkId, addr: string) => `${NETWORKS[n].explorer}/address/${addr}`;
export const explorerTx = (n: NetworkId, hash: string) => `${NETWORKS[n].explorer}/tx/${hash}`;
