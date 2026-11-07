import type { Finding } from "./api-types";
import { NETWORKS, isNetworkId } from "./networks";

// "Frozen by Circle (USDC) on Arbitrum, 2026-11-06": one line per chain. When an issuer blacklists the same address on several
// chains on one day, that is one decision, so it is shown (and counted) once, with a link to each chain's transaction.
const FREEZE = /^Frozen by (\w+) \((\w+)\) on (.+), (\d{4}-\d{2}-\d{2})$/;

export const chainName = (id: string) => (isNetworkId(id) ? NETWORKS[id].label : id.charAt(0).toUpperCase() + id.slice(1));

export function mergeFreezes(findings: Finding[]): Finding[] {
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const m = f.category === "frozen" ? FREEZE.exec(f.label) : null;
    if (m && f.chain) groups.set(`${m[1]}|${m[2]}|${m[4]}`, [...(groups.get(`${m[1]}|${m[2]}|${m[4]}`) ?? []), f]);
  }
  const out: Finding[] = [];
  const done = new Set<string>();
  for (const f of findings) {
    const m = f.category === "frozen" ? FREEZE.exec(f.label) : null;
    const key = m && f.chain ? `${m[1]}|${m[2]}|${m[4]}` : null;
    const group = key ? groups.get(key)! : null;
    if (!key || !group || group.length < 2) {
      out.push(f);
      continue;
    }
    if (done.has(key)) continue;
    done.add(key);
    out.push({
      ...f,
      label: `Frozen by ${m![1]} (${m![2]}) on ${group.length} networks, ${m![4]}`,
      url: null,
      chain: null,
      merged: group.map((g) => ({ chain: g.chain as string, url: g.url })),
    });
  }
  return out;
}

// A sanctioned address is shown in its own "Sanctions" block; the same official-list entry must not appear a second time in the
// list of findings (and be counted as one more signal). Matched exactly by "<list>: <name>", so another person of the same
// OFAC entry, or another source (GoPlus, Etherscan labels), stays.
export function withoutListedSanctions(findings: Finding[], sanctions: { list: string; name: string }[]): Finding[] {
  if (sanctions.length === 0) return findings;
  const shown = new Set(sanctions.map((s) => `${s.list}: ${s.name}`));
  return findings.filter((f) => !(f.category === "sanctioned" && shown.has(f.label)));
}

export interface LatestFrozenRow {
  address: string;
  asset: string;
  issuer: string;
  chain: string;
  chains: string[];
  /** ms */
  at: number;
}

/** The newest freezes as rows for the home page: one row per address and asset (an issuer often blocks one address on several networks at once), at most `max` rows, newest first as given. */
export function latestFrozenRows(items: { address: string; chain: string; asset: string; issuer: string; frozenAt: number }[], max = 5): LatestFrozenRow[] {
  const rows: LatestFrozenRow[] = [];
  for (const it of items) {
    const row = rows.find((r) => r.address.toLowerCase() === it.address.toLowerCase() && r.asset === it.asset);
    if (row) row.chains.push(chainName(it.chain));
    else if (rows.length < max) rows.push({ address: it.address, asset: it.asset, issuer: it.issuer, chain: it.chain, chains: [chainName(it.chain)], at: it.frozenAt * 1000 });
  }
  return rows;
}
