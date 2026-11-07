import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { safeTarget } from "./metrics";

describe("safeTarget", () => {
  it("keeps addresses and ENS names", () => {
    const evm = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    expect(safeTarget(`  ${evm} `)).toBe(evm);
    expect(safeTarget("TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE")).toBe("TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE");
    expect(safeTarget("vitalik.eth")).toBe("vitalik.eth");
  });
  it("replaces e-mails, names and other text with a marker", () => {
    expect(safeTarget("ivan.petrov@mail.ru")).toBe("[not an address, 19 chars]");
    expect(safeTarget("Иван Петров")).toBe("[not an address, 11 chars]");
    expect(safeTarget("0x123")).toBe("[not an address, 5 chars]");
  });
  const EVM = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const cases: [string, string, string][] = [
    ["spaced address becomes the clean address", ` ${EVM.slice(0, 20)} ${EVM.slice(20)} `, EVM],
    ["explorer link keeps only the address", `https://etherscan.io/address/${EVM}`, EVM],
    ["0X prefix", `0X${EVM.slice(2)}`, EVM],
    ["bitcoin legacy", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"],
    ["bitcoin P2SH", "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"],
    ["bech32", "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"],
    ["upper-case ENS", "VITALIK.ETH", "VITALIK.ETH"],
    ["tx hash / private key look-alike", `0x${"ab".repeat(32)}`, "[not an address, 66 chars]"],
    ["64 hex without prefix", "ab".repeat(32), "[not an address, 64 chars]"],
    ["39-char 0x string", EVM.slice(0, 41), "[not an address, 41 chars]"],
    ["41-char 0x string", `${EVM}1`, "[not an address, 43 chars]"],
    ["foreign link with the address inside", `https://evil.example/?a=${EVM}`, "[not an address, 66 chars]"],
    ["seed phrase", "abandon ability able about above absent", "[not an address, 39 chars]"],
    ["sentence ending in .eth", "my name is x.eth", "[not an address, 16 chars]"],
    ["empty", "", "[not an address, 0 chars]"],
  ];
  it.each(cases)("%s", (_n, input, out) => expect(safeTarget(input)).toBe(out));
  it("never contains a piece of non-address text", () => {
    expect(safeTarget("ivan@mail.ru phone +7 999")).not.toMatch(/ivan|mail|999/);
  });
});
