import type { Finding } from "./api-types";

// Labels that come from Etherscan-family explorers (name tags / label cloud) are shown as "found in the Etherscan database"
// with a link to the address page there, so the visitor can see the original entry.
const SITES: Record<string, string> = {
  "etherscan.io": "Etherscan",
  "arbiscan.io": "Arbiscan",
  "bscscan.com": "BscScan",
  "polygonscan.com": "PolygonScan",
  "basescan.org": "BaseScan",
  "optimistic.etherscan.io": "Optimistic Etherscan",
  "snowtrace.io": "Snowtrace",
};
const ETHERSCAN_SOURCES = new Set(["etherscan-labels", "eth-labels"]);

/** The explorer's name when this finding is an Etherscan-family label with a link to its address page, else null. */
export function etherscanSite(f: Pick<Finding, "source" | "url">): { name: string; url: string } | null {
  if (!ETHERSCAN_SOURCES.has(f.source) || !f.url) return null;
  try {
    const host = new URL(f.url).hostname.replace(/^www\./, "");
    return SITES[host] ? { name: SITES[host], url: f.url } : null;
  } catch {
    return null;
  }
}
