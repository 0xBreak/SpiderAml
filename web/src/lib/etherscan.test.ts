import { describe, expect, it } from "vitest";
import { etherscanSite } from "./etherscan";

const f = (source: string, url: string | null) => ({ source, url });

describe("etherscanSite", () => {
  it("recognises Etherscan-family labels with a link to the address page", () => {
    expect(etherscanSite(f("etherscan-labels", "https://etherscan.io/address/0xabc"))).toEqual({ name: "Etherscan", url: "https://etherscan.io/address/0xabc" });
    expect(etherscanSite(f("eth-labels", "https://basescan.org/address/0xabc"))?.name).toBe("BaseScan");
    expect(etherscanSite(f("eth-labels", "https://optimistic.etherscan.io/address/0xabc"))?.name).toBe("Optimistic Etherscan");
  });
  it("ignores other sources even when they link to an explorer (freeze transactions)", () => {
    expect(etherscanSite(f("stablecoin-freezes", "https://etherscan.io/tx/0x1"))).toBeNull();
  });
  it("ignores missing, broken or foreign links", () => {
    expect(etherscanSite(f("eth-labels", null))).toBeNull();
    expect(etherscanSite(f("eth-labels", "not a url"))).toBeNull();
    expect(etherscanSite(f("eth-labels", "https://evil.example/address/0x1"))).toBeNull();
  });
});
