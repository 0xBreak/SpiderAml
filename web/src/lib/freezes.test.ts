import { describe, expect, it } from "vitest";
import type { Finding } from "./api-types";
import { latestFrozenRows, mergeFreezes, withoutListedSanctions } from "./freezes";

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

describe("latestFrozenRows", () => {
  const fz = (address: string, chain: string, asset: string, frozenAt: number) => ({ address, chain, asset, issuer: asset === "USDC" ? "Circle" : "Tether", frozenAt });
  it("makes one row per address and asset, with all its networks, newest first as given", () => {
    const rows = latestFrozenRows([fz("0xAA", "base", "USDC", 300), fz("0xaa", "ethereum", "USDC", 300), fz("0xBB", "tron", "USDT", 200), fz("0xaa", "ethereum", "USDT", 100)]);
    expect(rows.map((r) => [r.address, r.asset, r.chains])).toEqual([
      ["0xAA", "USDC", ["Base", "Ethereum"]],
      ["0xBB", "USDT", ["Tron"]],
      ["0xaa", "USDT", ["Ethereum"]],
    ]);
    expect(rows[0].at).toBe(300_000);
  });
  it("stops at the maximum number of rows but still adds networks to rows already shown", () => {
    const items = [fz("0x1", "base", "USDC", 5), fz("0x2", "base", "USDC", 4), fz("0x3", "base", "USDC", 3), fz("0x1", "polygon", "USDC", 2)];
    const rows = latestFrozenRows(items, 2);
    expect(rows).toHaveLength(2);
    expect(rows[0].chains).toEqual(["Base", "Polygon"]);
  });
});
