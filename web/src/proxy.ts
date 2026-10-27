// Counts page views on the server: no cookies, no client script. The data layer hashes IP + user agent with a daily salt
// and never stores either. Prefetches, assets and API calls are not counted.
// Locale routing (next-intl) is composed here: canonical-host redirect first,
// then the intl middleware (redirect/forward), then counting of the final page view.
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|brand|apple-icon|opengraph-image|.*\\..*).*)"],
};

const handleI18nRouting = createMiddleware(routing);

/** spideraml.com in production (set in docker-compose); empty locally, so dev on localhost is untouched. */
const CANONICAL_HOST = process.env.CANONICAL_HOST ?? "";

export function proxy(req: NextRequest, ev: NextFetchEvent) {
  const h = req.headers;

  // One address only: plain http, Cloudflare's alternative ports (8080, 8443…) and www all go to https://spideraml.com.
  if (CANONICAL_HOST) {
    const scheme = /"scheme":"(\w+)"/.exec(h.get("cf-visitor") ?? "")?.[1] ?? h.get("x-forwarded-proto") ?? "https";
    const host = h.get("host") ?? "";
    // requests from inside the server (Docker healthcheck, curl 127.0.0.1:3000) are left alone
    const internal = /^(localhost|127\.0\.0\.1|web)(:\d+)?$/.test(host);
    if (!internal && (scheme !== "https" || host !== CANONICAL_HOST)) {
      return NextResponse.redirect(`https://${CANONICAL_HOST}${req.nextUrl.pathname}${req.nextUrl.search}`, 301);
    }
  }

  const intlRes = handleI18nRouting(req);

  const isPrefetch = h.get("next-router-prefetch") === "1" || h.get("purpose") === "prefetch" || h.get("sec-purpose")?.includes("prefetch");
  // the Docker healthcheck and anything else from inside the server is not a visitor
  const fromInside = /^(localhost|127\.0\.0\.1|web)(:\d+)?$/.test(h.get("host") ?? "");
  // Locale redirects (e.g. `/` -> `/en` for English browsers) are not views;
  // the target page is counted when it is requested.
  const isRedirect = intlRes.status >= 300 && intlRes.status < 400;
  if (req.method === "GET" && !isPrefetch && !fromInside && !isRedirect && process.env.DATA_SECRET) {
    const body = {
      ip: h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local",
      ua: h.get("user-agent") ?? "",
      // client-side navigations carry no useful referrer; only the first document request does
      events: [{ kind: "pageview", path: req.nextUrl.pathname, ref: h.get("rsc") ? null : h.get("referer") }],
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
  return intlRes;
}
