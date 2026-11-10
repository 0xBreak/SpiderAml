import { describe, expect, it } from "vitest";
import { visitorHints } from "./hints";

const headers = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });

describe("visitorHints", () => {
  it("joins language, platform and mobile flag in a stable, normalised form", () => {
    expect(visitorHints(headers({ "accept-language": "ru-RU, ru;q=0.9", "sec-ch-ua-platform": '"Windows"', "sec-ch-ua-mobile": "?0" }))).toBe("ru-ru,ru;q=0.9|windows|?0");
  });
  it("is empty when the browser sends none of them", () => expect(visitorHints(headers({}))).toBe(""));
  it("different languages differ, the same stays the same", () => {
    expect(visitorHints(headers({ "accept-language": "en-US" }))).not.toBe(visitorHints(headers({ "accept-language": "ru-RU" })));
    expect(visitorHints(headers({ "accept-language": "en-US" }))).toBe(visitorHints(headers({ "accept-language": "EN-us" })));
  });
  it("is cut to a safe length", () => expect(visitorHints(headers({ "accept-language": "x".repeat(500) })).length).toBeLessThan(120));
});
