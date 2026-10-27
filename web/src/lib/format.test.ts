import { describe, expect, it } from "vitest";
import { num, pct, price, short, usd } from "./format";

describe("usd", () => {
  it("formats zero and small amounts without compacting", () => {
    expect(usd(0)).toContain("0");
    expect(usd(0.4)).toContain("$");
  });
  it("compacts large amounts", () => {
    expect(usd(25_000)).toContain("тыс.");
  });
  it("returns a dash for missing values", () => {
    expect(usd(null)).toBe("—");
    expect(usd(NaN)).toBe("—");
  });
});

describe("price", () => {
  it("keeps significant digits for tiny prices", () => {
    expect(price(0.00001234)).toBe("$0.0000123");
  });
  it("returns a dash for missing values", () => {
    expect(price(undefined)).toBe("—");
  });
});

describe("num / pct", () => {
  it("compacts big numbers", () => {
    expect(num(1_500_000)).toContain("млн");
  });
  it("formats percents with one digit", () => {
    expect(pct(12.345)).toBe("12.3%");
    expect(pct(null)).toBe("—");
  });
});

describe("short", () => {
  it("truncates long addresses", () => {
    expect(short("0x1234567890abcdef")).toBe("0x1234…cdef");
  });
  it("leaves short strings alone", () => {
    expect(short("abc")).toBe("abc");
  });
});
