// Counts page views on the server: no cookies, no client script. The data layer hashes IP + user agent with a daily salt
// and never stores either. Prefetches, assets and API calls are not counted.
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/|api/|brand/|favicon.ico|apple-icon|opengraph-image|robots.txt|sitemap.xml).*)"],
};

export function middleware(req: NextRequest, ev: NextFetchEvent) {
  const h = req.headers;
  const isPrefetch = h.get("next-router-prefetch") === "1" || h.get("purpose") === "prefetch" || h.get("sec-purpose")?.includes("prefetch");
  if (req.method === "GET" && !isPrefetch && process.env.DATA_SECRET) {
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
  return NextResponse.next();
}
