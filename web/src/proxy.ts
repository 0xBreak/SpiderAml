// Request gate, in this order:
//  1. canonical host: plain http, Cloudflare's alternative ports (8080, 8443…) and www go to https://spideraml.com;
//  2. first visit without a language choice: English for non-Russian readers (see i18n/detect.ts);
//  3. next-intl routing (`/` Russian, `/en/...` English);
//  4. analytics for what only the server can see: messenger link previews and requests that are not a person.
// Page views of people are counted by ClickTracker once the page runs in a visible tab, so robots that pretend to be
// browsers never reach the visitor count.
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { pickLocale } from "./i18n/detect";
import { routing } from "./i18n/routing";
import { OWNER_COOKIE } from "./lib/owner";
import { visitorHints } from "./lib/hints";
import { clientIp } from "./lib/ip";

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|brand|apple-icon|opengraph-image|.*\\..*).*)"],
};

const handleI18nRouting = createMiddleware(routing);

/** Messenger and social preview fetchers: the data layer turns their visit into "the link was shared". */
const SHARE_BOT = /TelegramBot|WhatsApp|facebookexternalhit|Facebot|Twitterbot|Discordbot|Slackbot|vkShare|LinkedInBot|Viber|SkypeUriPreview/i;
/** Pages that exist (with or without the /en prefix); anything else is a scanner guessing paths. */
const SITE_PAGES = /^(?:\/en)?(?:\/(?:check(?:\/pdf)?|token|whales|sanctions(?:\/(?:frozen|[A-Za-z0-9]{20,100}))?|send|report(?:\/status)?|terms|privacy|support|blog(?:\/[a-z0-9-]+)?))?\/?$/;
const CRAWLER = /bot|crawl|spider|slurp|preview|headless|wget|curl|python|go-http|httpclient/i;

/** spideraml.com in production (set in docker-compose); empty locally, so dev on localhost is untouched. */
const CANONICAL_HOST = process.env.CANONICAL_HOST ?? "";
const INTERNAL = /^(localhost|127\.0\.0\.1|web)(:\d+)?$/;

/** Crawlers that ignore robots.txt as often as not: refused before any page is rendered. */
const GREEDY_BOT = /GPTBot|ClaudeBot|anthropic-ai|CCBot|Bytespider|Amazonbot|meta-externalagent|PetalBot|DotBot|MJ12bot|AhrefsBot|SemrushBot|DataForSeoBot|ImagesiftBot|cohere-ai|PerplexityBot|omgili|Diffbot|Timpibot/i;
/** Pages where a request runs a real check or query: a robot that says so in its user agent does not get them (a browser without Sec-Fetch headers, an old Safari, still does). */
/** A narrower test than CRAWLER for refusing a request: 'bot' inside a phone model (Cubot) or 'preview' inside a browser name must not lock a real person out. */
const ROBOT = /\b(?:bot|crawler|spider)\b|bot\/|crawl|slurp|headless|wget|curl\/|python-requests|python-urllib|go-http-client|httpclient/i;
const COSTLY = /^(?:\/en)?\/(?:check|token|whales|sanctions)(?:\/pdf)?\/?$/;

export function proxy(req: NextRequest, ev: NextFetchEvent) {
  const h = req.headers;
  const uaIn = h.get("user-agent") ?? "";
  if (GREEDY_BOT.test(uaIn)) return new NextResponse("Forbidden", { status: 403, headers: { "cache-control": "no-store" } });
  if (req.method === "GET" && req.nextUrl.search && COSTLY.test(req.nextUrl.pathname) && !INTERNAL.test(h.get("host") ?? "") && !SHARE_BOT.test(uaIn) && ROBOT.test(uaIn)) {
    // a search engine is told "forbidden" (robots.txt already says so): a 429 would make it slow down on the whole site
    if (/Googlebot|bingbot|DuckDuckBot|YandexBot|Baiduspider|Applebot/i.test(uaIn)) return new NextResponse("Forbidden", { status: 403, headers: { "cache-control": "no-store" } });
    return new NextResponse("Too Many Requests", { status: 429, headers: { "retry-after": "3600", "cache-control": "no-store" } });
  }
  const host = h.get("host") ?? "";
  const fromInside = INTERNAL.test(host);

  if (CANONICAL_HOST) {
    const scheme = /"scheme":"(\w+)"/.exec(h.get("cf-visitor") ?? "")?.[1] ?? h.get("x-forwarded-proto") ?? "https";
    // requests from inside the server (Docker healthcheck, curl 127.0.0.1:3000) are left alone
    if (!fromInside && (scheme !== "https" || host !== CANONICAL_HOST)) {
      return NextResponse.redirect(`https://${CANONICAL_HOST}${req.nextUrl.pathname}${req.nextUrl.search}`, 301);
    }
  }

  // first visit: no stored choice, a Russian-language URL, a person (not a crawler) whose browser does not read Russian
  const ua = h.get("user-agent") ?? "";
  const hasChoice = !!req.cookies.get("NEXT_LOCALE")?.value;
  const prefixed = req.nextUrl.pathname === "/en" || req.nextUrl.pathname.startsWith("/en/");
  if (req.method === "GET" && !hasChoice && !prefixed && !CRAWLER.test(ua) && !SHARE_BOT.test(ua) && pickLocale(h.get("accept-language")) === "en") {
    return NextResponse.redirect(new URL(`/en${req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname}${req.nextUrl.search}`, req.url), 307);
  }

  const intlRes = handleI18nRouting(req);

  // ?me=1 marks this browser as the owner's so its visits stay out of the statistics; ?me=0 removes the mark
  const me = req.nextUrl.searchParams.get("me");
  if (me === "1" || me === "0") intlRes.cookies.set(OWNER_COOKIE, "1", { path: "/", maxAge: me === "1" ? 31_536_000 : 0, sameSite: "lax", secure: !!CANONICAL_HOST });
  const owner = req.cookies.get(OWNER_COOKIE)?.value === "1";

  if (req.method === "GET" && !fromInside && !owner && process.env.DATA_SECRET && intlRes.status < 300) {
    const sitePage = SITE_PAGES.test(req.nextUrl.pathname);
    const preview = SHARE_BOT.test(ua);
    // browsers mark every request with Sec-Fetch-*; robots and scripts mostly do not
    const browser = !!h.get("sec-fetch-dest");
    const kind = preview && sitePage ? "pageview" : !browser || !sitePage ? "probe" : null;
    if (kind) {
      const body = {
        ip: clientIp(h),
        ua,
        country: h.get("cf-ipcountry"),
        hints: visitorHints(h),
        events: [{ kind, path: req.nextUrl.pathname.replace(/^\/en(?=\/|$)/, "") || "/" }],
      };
      ev.waitUntil(
        fetch(`${process.env.DATA_URL ?? "http://127.0.0.1:8787"}/v1/events`, {
          method: "POST",
          headers: { "x-spider-key": process.env.DATA_SECRET, "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(3000),
        }).catch(() => {}),
      );
    }
  }
  return intlRes;
}
