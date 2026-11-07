import { describe, expect, it } from "vitest";
import { cleanAddressInput, fail, formString, honeypotHit, isAnyAddress, isEvmAddress, isHttpsUrl, isOk, isTronAddress, ok } from "./action";

describe("address validators", () => {
  it("accepts checksummed and lowercase EVM addresses", () => {
    expect(isEvmAddress("0x098B716B8Aaf21512996dC57EB0615e2383E2f96")).toBe(true);
    expect(isEvmAddress("0xd8da6bf26964af9d7eed9e03e53415d37aa96045")).toBe(true);
    expect(isEvmAddress("0x123")).toBe(false);
    expect(isEvmAddress("not-an-address")).toBe(false);
  });
  it("accepts Tron base58check addresses", () => {
    expect(isTronAddress("TJCnKs_OTJ-J9?")).toBe(false);
    expect(isTronAddress("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")).toBe(true);
  });
  it("isAnyAddress covers EVM, Tron and Bitcoin", () => {
    expect(isAnyAddress("0xd8da6bf26964af9d7eed9e03e53415d37aa96045")).toBe(true);
    expect(isAnyAddress("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")).toBe(true);
    expect(isAnyAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toBe(true);
    expect(isAnyAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(true);
    expect(isAnyAddress("ivan.petrov@mail.ru")).toBe(false);
    expect(isAnyAddress("0x123")).toBe(false);
  });
});

describe("isHttpsUrl", () => {
  it("requires https with a host", () => {
    expect(isHttpsUrl("https://example.com/proof")).toBe(true);
    expect(isHttpsUrl("http://example.com")).toBe(false);
    expect(isHttpsUrl("https://")).toBe(false);
    expect(isHttpsUrl("")).toBe(false);
  });
});

describe("form helpers", () => {
  it("formString trims values", () => {
    const form = new FormData();
    form.set("address", "  0xabc  ");
    expect(formString(form, "address")).toBe("0xabc");
    expect(formString(form, "missing")).toBe("");
  });
  it("honeypotHit detects bots", () => {
    const clean = new FormData();
    expect(honeypotHit(clean)).toBe(false);
    const bot = new FormData();
    bot.set("website", "http://spam.example");
    expect(honeypotHit(bot)).toBe(true);
  });
});

describe("result envelope", () => {
  it("ok spreads data, fail carries a message", () => {
    const good = ok({ id: 1 });
    expect(isOk(good)).toBe(true);
    if (isOk(good)) expect(good.id).toBe(1);
    const bad = fail("Что-то пошло не так.", "UPSTREAM");
    expect(isOk(bad)).toBe(false);
    expect(bad.error).toContain("Что-то");
  });
});

const EVM = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const TRON = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const P2PKH = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const P2SH = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy";
const BECH = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";

describe("cleanAddressInput (what a pasted value turns into)", () => {
  const cases: [string, string, string][] = [
    ["outer spaces/newline/tab", `  \t${EVM}\n`, EVM],
    ["inner space", `${EVM.slice(0, 20)} ${EVM.slice(20)}`, EVM],
    ["inner line break", `${EVM.slice(0, 20)}\r\n${EVM.slice(20)}`, EVM],
    ["zero-width space", `${EVM.slice(0, 10)}\u200B${EVM.slice(10)}`, EVM],
    ["BOM and NBSP", `\uFEFF\u00A0${EVM}\u00A0`, EVM],
    ["0X prefix", `0X${EVM.slice(2)}`, EVM],
    ["lowercase", EVM.toLowerCase(), EVM.toLowerCase()],
    ["tron with space", `${TRON.slice(0, 17)} ${TRON.slice(17)}`, TRON],
    ["bitcoin P2PKH", P2PKH, P2PKH],
    ["bitcoin P2SH", ` ${P2SH} `, P2SH],
    ["bech32 lower", BECH, BECH],
    ["etherscan link", `https://etherscan.io/address/${EVM}`, EVM],
    ["arbiscan token link with query", `https://arbiscan.io/token/${EVM}?a=1#code`, EVM],
    ["tronscan hash link", `https://tronscan.org/#/address/${TRON}`, TRON],
    ["mempool link", `https://mempool.space/address/${BECH}`, BECH],
    ["link of an unknown site stays as is", `https://evil.example/address/${EVM}`, `https://evil.example/address/${EVM}`],
    ["link look-alike host stays as is", `https://etherscan.io.evil.example/address/${EVM}`, `https://etherscan.io.evil.example/address/${EVM}`],
    ["tx link is not an address", `https://etherscan.io/tx/0x${"a".repeat(64)}`, `https://etherscan.io/tx/0x${"a".repeat(64)}`],
    ["tx hash stays", `0x${"a".repeat(64)}`, `0x${"a".repeat(64)}`],
    ["39 chars stays (no guessing)", EVM.slice(0, 41), EVM.slice(0, 41)],
    ["ENS trimmed", "  vitalik.eth ", "vitalik.eth"],
    ["sentence ending in .eth is not glued into a name", "my name is x.eth", "my name is x.eth"],
    ["e-mail stays", "ivan@mail.ru", "ivan@mail.ru"],
    ["seed phrase keeps its spaces", "abandon ability able about", "abandon ability able about"],
    ["empty", "   ", ""],
  ];
  it.each(cases)("%s", (_n, input, out) => expect(cleanAddressInput(input)).toBe(out));

  it("validators after cleaning: what the user ends up with", () => {
    const ok = (s: string) => isAnyAddress(cleanAddressInput(s));
    expect(ok(` ${EVM.slice(0, 20)} ${EVM.slice(20)}\n`)).toBe(true);
    expect(ok(`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6`)).toBe(false); // one char short
    expect(ok(`0x${"a".repeat(64)}`)).toBe(false); // tx hash
    expect(ok(EVM.slice(0, 41))).toBe(false); // 39 hex digits
    expect(ok(`${EVM}0`)).toBe(false); // 41 hex digits
    expect(ok("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3T4")).toBe(false); // mixed-case bech32
    expect(ok(BECH.toUpperCase())).toBe(true); // all upper case is allowed
  });
});
