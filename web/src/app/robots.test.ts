import { describe, expect, it } from "vitest";
import robots from "./robots";

const GREEDY_RE = /GPTBot|ClaudeBot|anthropic-ai|CCBot|Bytespider|Amazonbot|meta-externalagent|PetalBot|DotBot|MJ12bot|AhrefsBot|SemrushBot|DataForSeoBot|ImagesiftBot|cohere-ai|PerplexityBot|omgili|Diffbot|Timpibot/i;

describe("robots.txt", () => {
  const r = robots();
  const rules = r.rules as { userAgent: string | string[]; allow?: string; disallow?: string | string[] }[];
  it("shuts out greedy bots entirely and keeps search engines and link previews out of that list", () => {
    const g = rules.find((x) => x.disallow === "/")!;
    const ua = ([] as string[]).concat(g.userAgent);
    for (const s of ["GPTBot", "ClaudeBot", "CCBot", "PerplexityBot"]) expect(ua).toContain(s);
    for (const s of ["Googlebot", "bingbot", "YandexBot", "TelegramBot", "Twitterbot", "facebookexternalhit"]) expect(ua).not.toContain(s);
  });
  it("every robots.txt greedy agent (except the robots-only Applebot-Extended) is also refused by the proxy regex", async () => {
    const g = rules.find((x) => x.disallow === "/")!;
    for (const s of ([] as string[]).concat(g.userAgent).filter((x) => x !== "Applebot-Extended")) expect(GREEDY_RE.test(s), s).toBe(true);
  });
  it("the generic group keeps pages open but closes parameterised URLs and the pdf", () => {
    const d = rules.find((x) => x.userAgent === "*")!;
    expect(d.allow).toBe("/");
    for (const p of ["/api/", "/*?address=", "/*?q=", "/*?page=", "/*?network=", "/check/pdf", "/en/check/pdf"]) expect(d.disallow).toContain(p);
  });
  it("points to the sitemap", () => expect(String(r.sitemap)).toMatch(/\/sitemap\.xml$/));
});
