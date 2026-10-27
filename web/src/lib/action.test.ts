import { describe, expect, it } from "vitest";
import { fail, formString, honeypotHit, isAnyAddress, isEvmAddress, isHttpsUrl, isOk, isTronAddress, ok } from "./action";

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
  it("isAnyAddress covers both families", () => {
    expect(isAnyAddress("0xd8da6bf26964af9d7eed9e03e53415d37aa96045")).toBe(true);
    expect(isAnyAddress("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")).toBe(true);
    expect(isAnyAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toBe(false);
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
