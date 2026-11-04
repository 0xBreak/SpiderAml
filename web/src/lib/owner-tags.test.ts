import { describe, expect, it } from "vitest";
import { describeTag, owners } from "./owner-tags";

describe("describeTag", () => {
  it("splits a protocol label into name, detail and kind", () => {
    expect(describeTag("Balancer: LEND/ETH 50/50 #6 (balancer)")).toEqual({ name: "Balancer", detail: "LEND/ETH 50/50 #6", kind: "protocol", retired: false });
  });
  it("recognises bridges, exchanges, bots and tokens", () => {
    expect(describeTag("Hop Protocol: USDC Wrapper (hop-protocol)")?.kind).toBe("bridge");
    expect(describeTag("Binance: Hot Wallet")?.kind).toBe("exchange");
    expect(describeTag("MEV Bot: 0x123 (mev-bot)")?.kind).toBe("bot");
    expect(describeTag("bridged-token")).toMatchObject({ name: "Bridged token", kind: "token" });
  });
  it("reads token-list labels as the token itself", () => {
    expect(describeTag("Token: Apple Cash ($AAPL)")).toEqual({ name: "Apple Cash ($AAPL)", detail: null, kind: "token", retired: false });
  });
  it("hides labels that say nothing about an owner", () => {
    for (const l of ["Null: 0x111...111", "Deployer of malicious contract: Yearn (yDai) Exploiter", "Multichain Hack Alert 682 (take-action)", "sybil-delegate", "airdrop-hunter", "parity-bug"]) expect(describeTag(l)).toBeNull();
  });
  it("makes a readable name out of a bare slug and flags retired contracts", () => {
    expect(describeTag("rocket-pool")?.name).toBe("Rocket pool");
    expect(describeTag("Uniswap: Old Router (old-contract)")?.retired).toBe(true);
  });
});

describe("owners", () => {
  it("drops duplicates and junk, named kinds first", () => {
    const list = owners(["sybil-delegate", "SushiSwap: A (sushiswap)", "SushiSwap: A (sushiswap)", "something odd"]);
    expect(list.map((o) => o.name)).toEqual(["SushiSwap", "something odd"]);
  });
});
