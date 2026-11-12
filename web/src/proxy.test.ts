import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const ev = { waitUntil() {} } as never;
const req = (path: string, ua: string, host = "spideraml.com") => new NextRequest(`https://${host}${path}`, { headers: { "user-agent": ua, host } });
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

describe("proxy: greedy bots and robots on costly pages", () => {
  it.each(["Mozilla/5.0 (compatible; GPTBot/1.1)", "ClaudeBot/1.0", "Mozilla/5.0 (compatible; AhrefsBot/7.0)", "Bytespider"])("%s gets 403 anywhere", (ua) => {
    expect(proxy(req("/", ua), ev).status).toBe(403);
    expect(proxy(req("/blog/x", ua), ev).status).toBe(403);
  });
  it("search engines and a normal browser are not refused", () => {
    for (const ua of ["Mozilla/5.0 (compatible; Googlebot/2.1)", "Mozilla/5.0 (compatible; bingbot/2.0)", CHROME]) expect(proxy(req("/", ua), ev).status).not.toBe(403);
  });
  it("a robot gets 429 on a parameterised check, query or pdf page, but not on the static page", () => {
    const bot = "python-requests/2.31";
    for (const p of ["/check?address=0xabc", "/en/check/pdf?address=0xabc", "/sanctions?q=x", "/whales?page=2", "/token?address=0x1"]) expect(proxy(req(p, bot), ev).status, p).toBe(429);
    expect(proxy(req("/check", bot), ev).status).not.toBe(429);
    // a search engine is told 403 (robots.txt already says no), never 429: a 429 slows its crawl of the whole site
    expect(proxy(req("/check?address=0xabc", "Mozilla/5.0 (compatible; Googlebot/2.1)"), ev).status).toBe(403);
  });
  it("a person, a link-preview bot and the internal healthcheck keep the parameterised page", () => {
    expect(proxy(req("/check?address=0xabc", CHROME), ev).status).not.toBe(429);
    expect(proxy(req("/check?address=0xabc", "TelegramBot (like TwitterBot)"), ev).status).not.toBe(429);
    expect(proxy(req("/check?address=0xabc", "curl/8.0", "127.0.0.1:3000"), ev).status).not.toBe(429);
    expect(proxy(req("/check?address=0xabc", "Mozilla/5.0 (Linux; Android 11; Cubot X30) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"), ev).status).not.toBe(429);
  });
});
