import { describe, expect, it } from "vitest";
import type { Finding } from "./api-types";
import { mergeFreezes, withoutListedSanctions } from "./freezes";

const f = (chain: string, label: string, category: Finding["category"] = "frozen"): Finding => ({ category, severity: 2, label, source: "stablecoin-freezes", sourceName: "Stablecoin issuer freezes (Tether, Circle)", url: `https://x/${chain}`, chain });

describe("mergeFreezes", () => {
  it("shows one issuer decision on six chains as one finding with six links", () => {
    const rows = ["Arbitrum", "Base", "Optimism", "Polygon", "Ethereum", "Avalanche"].map((n) => f(n.toLowerCase(), `Frozen by Circle (USDC) on ${n}, 2026-11-06`));
    const out = mergeFreezes(rows);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Frozen by Circle (USDC) on 6 networks, 2026-11-06");
    expect(out[0].merged?.map((m) => m.chain)).toEqual(["arbitrum", "base", "optimism", "polygon", "ethereum", "avalanche"]);
  });
  it("keeps a single freeze, other days and other findings as they are", () => {
    const rows = [f("ethereum", "Frozen by Tether (USDT) on Ethereum, 2025-03-17"), f("base", "Frozen by Circle (USDC) on Base, 2026-11-06"), f("ethereum", "Frozen by Circle (USDC) on Ethereum, 2026-11-07"), f("ethereum", "Phishing", "phishing")];
    expect(mergeFreezes(rows)).toEqual(rows);
  });
  it("does not merge different issuers on the same day", () => {
    const rows = [f("ethereum", "Frozen by Tether (USDT) on Ethereum, 2026-11-06"), f("ethereum", "Frozen by Circle (USDC) on Ethereum, 2026-11-06")];
    expect(mergeFreezes(rows)).toHaveLength(2);
  });
});

describe("withoutListedSanctions", () => {
  const s = (label: string, source = "ofac-sdn"): Finding => ({ category: "sanctioned", severity: 3, label, source, sourceName: "x", url: null, chain: "evm" });
  it("drops the finding shown in the sanctions block, keeps other persons and other sources", () => {
    const rows = [s("OFAC SDN: A"), s("OFAC SDN: B"), s("Sanctioned address (SlowMist)", "goplus")];
    expect(withoutListedSanctions(rows, [{ list: "OFAC SDN", name: "A" }]).map((x) => x.label)).toEqual(["OFAC SDN: B", "Sanctioned address (SlowMist)"]);
  });
  it("changes nothing without sanctions", () => {
    const rows = [s("OFAC SDN: A")];
    expect(withoutListedSanctions(rows, [])).toBe(rows);
  });
});
