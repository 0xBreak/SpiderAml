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
