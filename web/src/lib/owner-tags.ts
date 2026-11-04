// Turns a raw neutral label ("Balancer: LEND/ETH 50/50 #6 (balancer)") into something a visitor can read:
// who it belongs to, what kind of thing it is, and a short detail. Labels that say nothing about an owner
// (victims of a hack, airdrop farmers, sybil lists) return null and are not shown in the "who owns it" card.

export type OwnerKind = "protocol" | "bridge" | "exchange" | "token" | "bot" | "other";

export interface OwnerInfo {
  name: string;
  detail: string | null;
  kind: OwnerKind;
  /** the label marks an old or retired contract */
  retired: boolean;
}

const NOT_AN_OWNER = /hack alert|take-action|sybil|airdrop-hunter|parity-bug|^delegate$|dust|spam|sanction|exploit|hack|scam|phish|rug ?pull|drainer|attacker|stolen|heist|malicious/i;
const EXCHANGES = /\b(binance|coinbase|kraken|okx|okex|kucoin|bitfinex|huobi|htx|bybit|gate\.io|bitstamp|gemini|crypto\.com|bitget|mexc)\b/i;
const BRIDGES = /bridge|wormhole|multichain|anyswap|hop protocol|hop-protocol|layerzero|stargate|across|synapse|portal|wrapper/i;
const DEX = /swap|dex|balancer|bancor|curve|kyber|uniswap|1inch|0x protocol|pool|vault|lend|aave|compound|maker|yearn|synthetix|cream|mstable|set protocol|augmented/i;

const humanizeSlug = (s: string) => {
  const t = s.replace(/-/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function describeTag(label: string): OwnerInfo | null {
  const raw = label.trim();
  if (!raw || NOT_AN_OWNER.test(raw)) return null;
  // "Token: Apple Cash ($AAPL)" (token lists): the token itself is the name; the brackets hold its symbol, not Etherscan tags
  const tokenPrefix = /^token:\s*(.+)$/i.exec(raw);
  if (tokenPrefix) return { name: tokenPrefix[1].trim(), detail: null, kind: "token", retired: false };
  // trailing "(slug, slug)" are Etherscan tags: keep them for classification, not for display
  const m = /\(([^()]*)\)\s*$/.exec(raw);
  const slugs = m ? m[1].split(",").map((x) => x.trim().toLowerCase()) : [];
  const text = (m ? raw.slice(0, m.index) : raw).trim();
  const colon = text.indexOf(":");
  const name = colon > 0 ? text.slice(0, colon).trim() : /^[a-z0-9]+(-[a-z0-9]+)+$/.test(text) ? humanizeSlug(text) : text;
  const detail = colon > 0 ? text.slice(colon + 1).trim() || null : null;
  if (!name || /^(null|none|unknown|0x[0-9a-f.…]*)$/i.test(name)) return null; // placeholder tags say nothing
  const hay = `${name} ${detail ?? ""} ${slugs.join(" ")}`;
  let kind: OwnerKind = "other";
  if (EXCHANGES.test(hay)) kind = "exchange";
  else if (slugs.includes("mev-bot") || /mev bot/i.test(hay)) kind = "bot";
  else if (slugs.some((s) => s === "token-contract" || s === "bridged-token") || /bridged token|token contract/i.test(hay)) kind = "token";
  else if (BRIDGES.test(hay) || slugs.includes("bridge")) kind = "bridge";
  else if (/token/i.test(name)) kind = "token";
  else if (DEX.test(hay) || slugs.includes("defi") || slugs.includes("dex")) kind = "protocol";
  const retired = slugs.includes("old-contract") || slugs.includes("deprecated");
  return { name, detail: detail && detail.length > 60 ? `${detail.slice(0, 57)}…` : detail, kind, retired };
}

/** Distinct readable owners, the most informative first (a named project with a detail before a bare name). */
export function owners(labels: string[], max = 4): OwnerInfo[] {
  const seen = new Set<string>();
  const out: OwnerInfo[] = [];
  for (const l of labels) {
    const o = describeTag(l);
    if (!o) continue;
    const key = `${o.name.toLowerCase()}|${(o.detail ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  out.sort((a, b) => Number(b.kind !== "other") - Number(a.kind !== "other") || Number(!!b.detail) - Number(!!a.detail));
  return out.slice(0, max);
}
