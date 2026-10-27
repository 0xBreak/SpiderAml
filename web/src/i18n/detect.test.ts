import { describe, expect, it } from "vitest";
import { pickLocale } from "./detect";

describe("pickLocale", () => {
  it("Russian readers get Russian", () => {
    for (const h of ["ru-RU,ru;q=0.9", "kk-KZ,kk;q=0.9", "uk-UA", "ky", "uz-UZ,ru;q=0.5", "ru,en;q=0.5"]) expect(pickLocale(h)).toBe("ru");
  });
  it("everyone else gets English", () => {
    for (const h of ["en-US,en;q=0.9", "de-DE,de;q=0.9", "tr-TR", "zh-CN,zh;q=0.9", "ja", "pt-BR,pt;q=0.9"]) expect(pickLocale(h)).toBe("en");
  });
  it("follows the visitor's own order", () => {
    expect(pickLocale("en;q=0.8,ru;q=0.9")).toBe("ru");
    expect(pickLocale("tr,ru;q=0.8")).toBe("ru");
    expect(pickLocale("tr,en;q=0.8")).toBe("en");
  });
  it("no header means the default (crawlers, scripts)", () => {
    expect(pickLocale(null)).toBe("ru");
    expect(pickLocale("")).toBe("ru");
    expect(pickLocale("*")).toBe("ru");
  });
});
